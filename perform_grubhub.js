/**
 * Perform module
 *
 * This file contains the business logic for ordering through Seamless. The
 * do() function below will initialize the headless browser, order using the
 * orders module, and generate confirmations.
 */

const puppeteer = require("puppeteer");
const Orders = require("./models/orders");
const Users = require("./models/users");
const Stats = require("./models/stats");
const Transform = require("./util/transform");
const Slack = require("./util/slack");
const logger = require("./logger")("perform");

const priv = require("./private");

// Setup
const URLS = {
  login: "https://www.grubhub.com/login",
  setupRest: "https://www.grubhub.com/lets-eat",
};
const INITIAL_RETRIES = 2;

// Args
const ORDER_TIME = process.argv.reduce((m, a) => a.includes("--time=") ? parseInt(a.substring(a.indexOf("=") + 1)) : m, 1730);
const DRY_RUN = !process.argv.reduce((m, a) => m || a === "--actual", false);
const POST_TO_SLACK = process.argv.reduce((m, a) => m || a === "--post", false);

const go = async () => {
  // Initialize data and browser
  const orders = await Orders.getOrders();
  if (orders.filter(o => !o.isDonor).length === 0) process.exit(0);

  const orderSets = Transform.indexByRestaurantAndUser(orders);

  const browser = await puppeteer.launch({
    // executablePath: "/usr/bin/chromium-browser",
    headless: false,
    // defaultViewport: {
      // width: 1200,
      // height: 900,
    // },
  });
  const page = await browser.newPage();

  // Start ordering process
  const results = [];
  try {
    await loginToGrubhub(page);
    logger.info("Logged in");

    for (const orderSet of orderSets) {
      logger.info(`Beginning order from ${orderSet.restaurant}`);
      const orderResult = await orderFromRestaurant(page, orderSet.restaurant, orderSet.users, INITIAL_RETRIES);
      const orderParticipants = orderSet.users.filter(u => !u.isDonor);

      if (orderResult.errors) {
        results.push({
          successful: false,
          restaurant: orderSet.restaurant,
          users: orderParticipants,
          errors: orderResult.errors,
        });
      } else {
        results.push({
          successful: true,
          restaurant: orderSet.restaurant,
          userCall: orderResult.user.slackId,
          confirmationUrl: `https://alfred.ajay-gandhi.com/confirmations/${sanitizeFilename(orderSet.restaurant)}.pdf`,
        });

        if (!DRY_RUN) {
          // Record stats
          await Promise.all(orderParticipants.map(async (userOrder) => {
            const slackId = userOrder.slackId;
            const isCallee = orderResult.user.slackId === slackId;
            return Stats.recordStats(slackId, orderSet.restaurant, orderResult.orderAmounts[slackId], userOrder.items, isCallee);
          }));

          // Write callee to orders
          await Orders.setCallee(orderResult.user.slackId);
        }
      }

      // Give Grubhub a break
      await page.waitFor(5000);
    }
  } catch (err) {
    logger.error(err);
  }

  if (POST_TO_SLACK) {
    await Slack.sendFinishedMessage(results, DRY_RUN);
  } else {
    logger.info(results);
  }
  await browser.close();
  process.exit(0);
};
setTimeout(go, 6000);

/**
 * Logs the given page into Grubhub
 */
const loginToGrubhub = async (page) => {
  await page.goto(URLS.login);

  await page.$eval("input[name=\"email\"]", (e, v) => e.value = v, priv.username);
  await page.$eval("input[name=\"password\"]", (e, v) => e.value = v, priv.password);

  await page.click("form.signInForm button");
  await page.waitForNavigation();
};

/**
 * Given a page with a logged-in status, this function will submit an order
 * at the given restaurant with the given items for the given slack IDs.
 */
const orderFromRestaurant = async (page, restaurant, userOrders, retries) => {
  try {
    let result = {};

    const slackIds = userOrders.map(o => o.slackId);

    const steps = [
      setupRestaurant.bind(null, page, restaurant),
      fillOrders.bind(null, page, userOrders),
      fillNames.bind(null, page, slackIds, result),
      fillPhoneNumber.bind(null, page, userOrders),
    ];

    // Here, we run each step one at a time. If a step fails and returns
    // retry: true, run the entire function again (up to INITIAL_RETRIES times)
    // If a step fails and with retry: false, return the error message
    // If a step has valuable output (only fillPhoneNumber() for now), save it
    // to result
    for (let step = 0; step < steps.length; step++) {
      const stepOutput = await steps[step]();
      if (stepOutput) {
        if (stepOutput.errors) {
          if (stepOutput.retry && retries > 0) {
            // Don't really care why, just retry
            return await orderFromRestaurant(page, restaurant, userOrders, retries - 1);
          } else {
            return stepOutput;
          }
        } else {
          result = Object.assign(result, stepOutput);
        }
      }
    }

    // Submit order
    const confirmationPath = `${__dirname}/confirmations/${sanitizeFilename(restaurant)}.pdf`;
    if (DRY_RUN) {
      await page.pdf({ path: confirmationPath });
      logger.info(`Simulated order from ${restaurant}, confirmation is in ${confirmationPath}`);
    } else {
      await page.click("button#ghs-checkout-review-submit");
      await page.waitForNavigation();
      await page.pdf({ path: confirmationPath });
      logger.info(`Ordered from ${restaurant}, confirmation is in ${confirmationPath}`);
    }

    return result;
  } catch (e) {
    logger.error(e);
    return {
      errors: ["Order failed for unknown reason."],
    };
  }
};

const setupRestaurant = async (page, restaurant) => {
  logger.info("Visiting restaurant");
  try {
    await page.goto(URLS.setupRest);
    await page.waitFor(3000);

    // Time
    await page.click("div.whenForSelector-btn");
    await page.waitFor("section.s-dialog-body");
    await page.waitFor(300);

    await page.select("section.s-dialog-body select", timeToString());
    await page.waitFor(500);
    await page.click("section.s-dialog-body button");
    await page.waitFor(500);

    // Restaurant
    await page.click("div.startOrder-search-input input");
    await page.waitFor(300);
    await page.click("div.navbar-menu-search input");
    await page.keyboard.type(restaurant);
    await page.waitFor("div.ghs-autocompleteResult-container");
    await page.waitFor(1000);
    await page.click("div.ghs-autocompleteResult-container:first-child");

    // Wait for items to appear
    await page.waitFor(() => document.querySelectorAll("div.menuItem").length > 0);
    await page.waitFor(1000);
  } catch (e) {
    if (e instanceof TypeError) {
      // Couldn't find restaurant containing given text
      return {
        retry: false,
        errors: ["Restaurant does not exist or is closed at this time."],
      };
    } else {
      // Most likely a timeout, should retry
      return {
        retry: true,
        errors: [e.toString()],
      };
    }
  }
};

/**
 * Given a page at the order stage, this function will add the given orders to
 * the cart.
 *
 * The userOrders parameter should be an array of objects of this form:
 *   {
 *     slackId: "bobby",
 *     items: [
 *       [
 *         "dish1",
 *         ["option 1", "option 2"],
 *       ],
 *       [
 *         "dish2",
 *         ["option 1", "option 2"],
 *       ],
 *     ]
 *   }
 */
const fillOrders = async (page, userOrders) => {
  logger.info("Inputting items");
  const orderAmounts = {};
  try {
    // Clear existing cart first
    await page.click("button.ghs-toggleCart");
    await page.waitFor(500);
    const isEmpty = await page.$("div.cart-error-emptyCart");
    const otherCart = await page.$("button.ghs-deleteCart");
    if (!isEmpty) {
      await page.click("button.ghs-confirmClearCart");
      await page.waitFor(500);
      await page.click("button.ghs-confirmChange");
      await page.waitFor(500);
    } else if (otherCart) {
      await page.click("button.ghs-deleteCart");
      await page.waitFor(500);
    }
    await page.click("button.ghs-toggleCart");
    await page.waitFor(500);

    const itemLinks = await page.$$("div.menuSection:not(.restaurant-order-history):not(.restaurant-favoriteItems) div.menuItemNew-name a");

    for (let i = 0; i < userOrders.length; i++) {
      // Record for stats
      orderAmounts[userOrders[i].slackId] = 0;
      for (const [item, options, comments] of userOrders[i].items) {
        // Click menu item
        await clickItem(page, item, itemLinks);
        await page.waitFor(200);

        // Select options
        const optionLinks = await page.$$("span.menuItemModal-choice-option-description");
        for (const opt of options) {
          for (const input of optionLinks) {
            const optionText = await page.evaluate(e => e.innerText, input);
            if (Transform.parseOption(optionText).name === opt) {
              await input.click();
              break;
            }
          }
        }

        // Input comments
        const commentSelector = "textarea.menuItemModal-special-instructions-textarea";
        const hasComments = await page.$(commentSelector);
        if (hasComments) {
          const name = (await Users.getUser(userOrders[i].slackId)).name;
          const commentsText = comments.length > 0 ? `\n${comments.join(", ")}` : "";
          const txt = `Please label for ${name}!${commentsText}`;
          await page.$eval(commentSelector, (e, v) => e.value = v, txt);
          await page.waitFor(500);
        }

        // Record for stats
        orderAmounts[userOrders[i].slackId] = await page.$eval("h5.menuItemModal-price", e => parseFloat(e.innerText.substring(1)));

        // Click add to order
        await page.click("footer.s-dialog--complex-footer button");
        await page.waitFor(() => !document.querySelector("div.s-dialog-body"));
        await page.waitFor(1000);
      }
    }
  } catch (e) {
    // Most likely a timeout, or we didn't wait long enough
    return {
      retry: true,
      errors: [e.toString()],
    };
  }

  const minimumMet = await page.$eval("button#ghs-cart-checkout-button", e => !e.disabled);
  if (!minimumMet) {
    return {
      retry: false,
      errors: ["Delivery minimum not met."],
    };
  }

  try {
    await page.click("button#ghs-cart-checkout-button");
    await page.waitForNavigation();
    // await page.waitFor(3000);
    return { orderAmounts };
  } catch (e) {
    // Most likely a timeout
    return {
      retry: true,
      errors: [e.toString()],
    };
  }
};

/**
 * Given a page at the checkout stage, this function will enter the given
 * names. The names parameter should be an array of tuples, where each tuple
 * contains the first and last names of all those involved in the order.
 */
const fillNames = async (page, slackIds, { orderAmounts }) => {
  logger.info("Inputting names");

  // Enable split with coworkers
  await page.waitFor("label[for=\"showAllocations\"]");
  await page.click("label[for=\"showAllocations\"]");
  await page.waitFor(200);

  for (const slackId of slackIds) {
    const name = (await Users.getUser(slackId)).name;
    if (name.toLowerCase() === "ajay gandhi") continue;

    await page.click("div.allocations-fields-container > div > input");
    await page.keyboard.type(name);

    await page.waitFor(4000);
    await page.click("div.allocations-autocomplete-dropdown div.s-row");
    await page.waitFor(5000);
  }

  if (!slackIds.includes(priv.mySlackId)) {
    // Clear my allocation if I'm not in the order
    await page.click("div.allocations-fields-container table tr:last-of-type td.u-text-right button");
    const myAllocation = await page.$("div.allocations-fields-container table tr:last-of-type td.u-text-secondary input");
    await myAllocation.click({ clickCount: 3 });
    await myAllocation.type("0");
    await page.click("div.allocations-fields-container table tr:last-of-type td.u-text-right button");
    await page.waitFor(2000);
  }

  const amountDue = await page.$eval("div.amount-due h6.lineItem-amount", e => Number(e.innerText.trim().substring(1)));
  if (amountDue > 0) {
    // Exceeded budget
    // If within 0.75, adjust tip
    const currentTip = await page.$eval("div.lineItems div.tip div.lineItem-amount", e => Number(e.innerText.trim().substring(1)));
    if (amountDue <= 0.75 && currentTip > 0.75) {
      // Leave some breathing room
      const newTip = (currentTip - amountDue - 0.01).toFixed(2);
      await page.click("div.tipEntryButton-customTip button");
      const tipInput = await page.$("input#customTipAmount");
      await tipInput.click({ clickCount: 3 });
      await tipInput.type(newTip.toString());
    } else {
      // Find person with most expensive order
      const maxOrder = Object.keys(orderAmounts).reduce((memo, slackId) => {
        if (orderAmounts[slackId] > memo.amount) {
          return {
            slackId,
            amount: orderAmounts[slackId],
          };
        } else {
          return memo;
        }
      }, { amount: 0 });

      return {
        retry: false,
        errors: [`Order exceeded budget by $${amountDue}. ${Slack.atUser(maxOrder.slackId)}'s order is the highest at $${maxOrder.amount.toFixed(2)}.`],
      };
    }
  }
};

/**
 * Given a page at the checkout page, fills out a random phone number.
 * Returns the user that was selected
 */
const fillPhoneNumber = async (page, orders) => {
  logger.info("Inputting phone number");
  try {

    // Eco-friendly order!
    const shouldClick = await page.$eval("div[at-delivery-instructions-toggle=\"true\"] use", e => e.getAttribute("href"));
    if (shouldClick === "#plus") await page.click("div[at-delivery-instructions-toggle=\"true\"]");
    await page.click("label[for=\"ghs-checkout-green\"]");

    const slackIds = orders.reduce((memo, o) => o.isDonor ? memo : memo.concat(o.slackId), []);
    const selectedUser = slackIds[Math.floor(Math.random() * slackIds.length)];
    const user = await Users.getUser(selectedUser);

    // Click on change info button
    await page.click("a.ghs-link-edit-info");

    // Input name + phone and continue
    await page.$eval("input.ghs-firstNameField", (e, v) => e.value = v, user.name.split(" ")[0]);
    await page.$eval("input.ghs-lastNameField", (e, v) => e.value = v, user.name.split(" ")[1]);
    await page.$eval("input.ghs-accountPhone", (e, v) => e.value = v, user.phone);
    await page.click("button#ghs-checkout-gather-submit");
    await page.waitFor(2000);

    return { user };
  } catch (e) {
    // Most likely a timeout
    return {
      retry: true,
      errors: [e.toString()],
    };
  }
};

/********************************** Helpers ***********************************/

/**
 * Converts a restaurant name to one that's nice for the FS
 */
const NOT_ALPHAN_REGEX = /[\W_]+/g;
const sanitizeFilename = n => n.replace(NOT_ALPHAN_REGEX, "_").replace(/^_+|_+$/g, "").toLowerCase();

/**
 * Given a page at the add items stage, returns the current food/beverages total
 */
const totalSelector = "div#OrderTotals table tbody tr:not(.noline):not(.subtotal) td:not(.main)";
const foodBevTotal = async (page) => {
  const textTotal = await page.$eval(totalSelector, e => e.innerText);
  return parseFloat(textTotal.substring(1));
}

/**
 * Returns the order time as an ISO string
 */
const timeToString = () => {
  const now = new Date();
  now.setHours(Math.floor(ORDER_TIME / 100), ORDER_TIME % 100, 0, 0);
  return now.toISOString();
};

/**
 * Finds the given item in the given array of links and clicks it
 */
const clickItem = async (page, item, links) => {
  for (const anchor of links) {
    const text = await page.evaluate(e => e.innerText.trim(), anchor);
    if (text === item) {
      anchor.click();
      break;
    }
  }
  await page.waitForSelector("div.s-dialog-body", { timeout: 20000 });
};

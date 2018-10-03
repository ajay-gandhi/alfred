/**
 * Perform module
 *
 * This file contains the business logic for ordering through Seamless. The
 * do() function below will initialize the headless browser, order using the
 * orders module, and generate confirmations.
 */

const puppeteer = require("puppeteer");
const Orders = require("./orders");
const Users = require("./users");
const Transform = require("./util/transform");
const Slack = require("./util/slack");

const private = require("./private");

const URLS = {
  login: "https://www.seamless.com/corporate/login/",
  chooseTime: "https://www.seamless.com/meals.m",
};
const INITIAL_RETRIES = 2;

const DEFAULT_TIME = "5:30 PM";

module.exports.do = async (dryRun) => {
  const orders = Orders.getOrders();
  if (Object.keys(orders).length === 0) return;

  const orderSets = Transform.extractOrdersAndNames(orders);

  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium-browser",
    defaultViewport: {
      width: 1200,
      height: 900,
    },
  });
  const page = await browser.newPage();

  const results = [];
  try {
    await loginToSeamless(page, private);
    console.log("Logged in");

    for (const orderSet of orderSets) {
      const orderResult = await orderFromRestaurant(page, orderSet.restaurant, orderSet.items, orderSet.names, dryRun, INITIAL_RETRIES);

      if (orderResult.errors) {
        results.push({
          successful: false,
          restaurant: orderSet.restaurant,
          errors: orderResult.errors,
        });
      } else {
        results.push({
          successful: true,
          restaurant: orderSet.restaurant,
          user: orderResult.user.username,
          confirmationUrl: `https://alfred.ajay-gandhi.com/confirmations/${sanitizeFilename(orderSet.restaurant)}.pdf`,
        });
      }

      // Give seamless a break
      await page.waitFor(5000);
    }

    Slack.sendFinishedMessage(results);
  } catch (err) {
    console.log("Crashed with error", err);
  }

  if (!dryRun) {
    // Clear orders if we're done
    Orders.clearOrders();
  }
  await browser.close();
};

/**
 * Given a puppeteer page, logs into Seamless with the given credentials.
 */
const loginToSeamless = async (page, creds) => {
  await page.goto(URLS.login);

  await page.click("input#username");
  await page.keyboard.type(creds.username);

  await page.click("input#password");
  await page.keyboard.type(creds.password);

  await page.click("a#submitLogin");
  await page.waitForNavigation();
};

/**
 * Given a page with a logged-in status, this function will submit an order
 * at the given restaurant with the given items for the given usernames.
 */
const orderFromRestaurant = async (page, restaurant, orders, usernames, dryRun, retries) => {
  try {
    let result = {};

    const steps = [
      chooseTime.bind(null, page),
      chooseRestaurant.bind(null, page, restaurant),
      fillOrders.bind(null, page, orders),
      fillNames.bind(null, page, usernames),
      fillPhoneNumber.bind(null, page, usernames),
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
            return await orderFromRestaurant(page, restaurant, orders, usernames, dryRun, retries - 1);
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
    if (dryRun) {
      await page.pdf({ path: confirmationPath });
      console.log(`Simulated order from ${restaurant}, confirmation is in ${confirmationPath}`);
    } else {
      await page.click("a.findfoodbutton");
      await page.waitForNavigation();
      await page.pdf({ path: confirmationPath });
      console.log(`Ordered from ${restaurant}, confirmation is in ${confirmationPath}`);
    }

    return result;
  } catch (e) {
    console.log(`Failed to order from ${restaurant}`, e);
    return {
      errors: ["Order failed for unknown reason."],
    };
  }
};

/**
 * Given a page with a logged in status, chooses a time for ordering
 */
const chooseTime = async (page) => {
  try {
    await page.goto(URLS.chooseTime);
    await page.select("#time", DEFAULT_TIME).catch(() => {});
    await page.click("tr.startorder a");
    await page.waitForNavigation();
  } catch (e) {
    return {
      retry: e.toString().includes("Navigation Timeout Exceeded"),
      errors: [e.toString()],
    };
  }
};

/**
 * Given a page at the restaurant selection page, chooses the given restaurant
 */
const chooseRestaurant = async (page, restaurant) => {
  try {
    const restLinks = await page.$$("a[name=\"vendorLocation\"]");
    let ourRest;
    for (const anchor of restLinks) {
      const text = await page.evaluate(e => e.innerText, anchor);
      if (text.includes(restaurant)) ourRest = anchor;
    }
    await ourRest.click();
    await page.waitForNavigation();
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
 * The orders parameter should be an array of this form:
 *   [
 *     [
 *       "dish1",
 *       ["option 1", "option 2"],
 *     ],
 *     [
 *       "dish2",
 *       ["option 1", "option 2"],
 *     ],
 *   ]
 */
const fillOrders = async (page, orders) => {
  try {
    for (const [item, options] of orders) {
      // Click menu item
      const itemLinks = await page.$$("a[name=\"product\"]");
      let ourItem;
      for (const anchor of itemLinks) {
        const text = await page.evaluate(e => e.innerText.toLowerCase(), anchor);
        if (text.includes(item.toLowerCase())) ourItem = anchor;
      }
      await ourItem.click();
      await page.waitFor(1500);

      // Select options
      const optionLinks = await page.$$("li label");
      for (const input of optionLinks) {
        const text = await page.evaluate(e => e.innerText.toLowerCase(), input);
        const isSelected = options.reduce((memo, o) => memo || text.includes(o.toLowerCase()), false);
        if (isSelected) await input.click();
      }

      // Click add to order
      await page.click("a#a1");
      await page.waitFor(2000);
    }
  } catch (e) {
    // Most likely a timeout, or we didn't wait long enough
    return {
      retry: true,
      errors: [e.toString()],
    };
  }

  await page.waitFor(2000);

  const continueLinks = await page.$$("a.findfoodbutton");
  if (continueLinks.length === 0) {
    return {
      retry: false,
      errors: ["Delivery minimum not met."],
    };
  }

  try {
    await page.evaluate(e => e.submit(), await page.$("form#pageForm"));
    await page.waitForNavigation();
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
 * usernames. The names parameter should be an array of tuples, where each
 * tuple contains the first and last names of all those involved in the order.
 */
const fillNames = async (page, usernames) => {
  // Clear existing names first
  while (await page.$("td.delete a")) {
    await page.click("td.delete a");
    await page.waitForNavigation();
  }

  for (const username of usernames) {
    const name = Users.getUser(username).name.split(" ");

    page.evaluate(() => toggleAddUser(true, true));
    await page.waitFor(1000);
    await page.click("input#FirstName");
    await page.keyboard.type(name[0]);

    await page.click("input#LastName");
    await page.keyboard.type(name[1]);

    await page.click("tr#AddUser h4.PrimaryLink a");
    await page.waitForNavigation();
  }

  const amountRemaining = (await page.$eval("span#RemainingToBeAllocated", e => e.innerText));
  if (amountRemaining.trim() !== "$0.00") {
    // Exceeded budget
    return {
      retry: false,
      errors: ["Order exceeded budget."],
    };
  }
};

/**
 * Given a page at the checkout page, fills out a random phone number.
 * Returns the user that was selected
 */
const fillPhoneNumber = async (page, usernames) => {
  try {
    const usersForOrder  = usernames.map(u => Users.getUser(u));
    const selectedUser = usersForOrder[Math.floor(Math.random() * usersForOrder.length)];
    await page.$eval("input#phoneNumber", e => e.value = "");
    await page.click("input#phoneNumber");
    await page.keyboard.type(selectedUser.phone);
    return { user: selectedUser };
  } catch (e) {
    // Most likely a timeout
    return {
      retry: true,
      errors: [e.toString()],
    };
  }
};

/**
 * Converts a restaurant name to one that's nice for the FS
 */
const NOT_ALPHAN_REGEX = /[\W_]+/g;
const sanitizeFilename = n => n.replace(NOT_ALPHAN_REGEX, "_").replace(/^_+|_+$/g, "").toLowerCase();

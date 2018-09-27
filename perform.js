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

const creds = require("./creds");

const URLS = {
  login: "https://www.seamless.com/corporate/login/",
  chooseTime: "https://www.seamless.com/meals.m",
};

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
    await loginToSeamless(page, creds);
    console.log("Logged in");

    for (const orderSet of orderSets) {
      const orderResult = await orderFromRestaurant(page, orderSet.restaurant, orderSet.items, orderSet.names, dryRun);

      if (orderResult) {
        results.push({
          successful: true,
          restaurant: orderSet.restaurant,
          user: orderResult.user.username,
          confirmationUrl: `https://alfred.ajay-gandhi.com/confirmations/${sanitizeFilename(orderSet.restaurant)}.pdf`,
        });
      } else {
        results.push({
          successful: false,
          restaurant: orderSet.restaurant,
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
const orderFromRestaurant = async (page, restaurant, orders, usernames, dryRun) => {
  try {
    await chooseTime(page);
    await chooseRestaurant(page, restaurant);
    await fillOrders(page, orders);
    await fillNames(page, usernames);
    const selectedUser = await fillPhoneNumber(page, usernames);

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

    return {
      user: selectedUser,
    };
  } catch (e) {
    console.log(`Failed to order from ${restaurant}`, e);
    return false;
  }
};

/**
 * Given a page with a logged in status, chooses a time for ordering
 */
const chooseTime = async (page) => {
  await page.goto(URLS.chooseTime);
  await page.select("#time", DEFAULT_TIME).catch(() => {});
  await page.click("tr.startorder a");
  await page.waitForNavigation();
};

/**
 * Given a page at the restaurant selection page, chooses the given restaurant
 */
const chooseRestaurant = async (page, restaurant) => {
  const restLinks = await page.$$("a[name=\"vendorLocation\"]");
  let ourRest;
  for (const anchor of restLinks) {
    const text = await page.evaluate(e => e.innerText, anchor);
    if (text.includes(restaurant)) ourRest = anchor;
  }
  await ourRest.click();
  await page.waitForNavigation();
};

/**
 * Given a page at the checkout page, fills out a random phone number.
 * Returns the user that was selected
 */
const fillPhoneNumber = async (page, usernames) => {
  const usersForOrder  = usernames.map(u => Users.getUser(u));
  const selectedUser = usersForOrder[Math.floor(Math.random() * usersForOrder.length)];
  await page.$eval("input#phoneNumber", e => e.value = "");
  await page.click("input#phoneNumber");
  await page.keyboard.type(selectedUser.phone);
  return selectedUser;
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
  await page.waitFor(2000);

  await page.evaluate(e => e.submit(), await page.$("form#pageForm"));
  await page.waitForNavigation();
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
};

/**
 * Converts a restaurant name to one that's nice for the FS
 */
const NOT_ALPHAN_REGEX = /[\W_]+/g;
const sanitizeFilename = n => n.replace(NOT_ALPHAN_REGEX, "_").replace(/^_+|_+$/g, "").toLowerCase();

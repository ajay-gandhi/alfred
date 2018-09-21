
const puppeteer = require("puppeteer");
const Orders = require("./orders");
const Users = require("./users");
const DataUtil = require("./data_util");

const CREDS = require("./creds");

const URLS = {
  login: "https://www.seamless.com/corporate/login/",
  choose_rest: "https://www.seamless.com/meals.m",
};

const DEFAULT_TIME = "5:30 PM";

module.exports = async (dry_run) => {
  const order_sets = extract_orders_and_names(Orders.get_orders());

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: {
      width: 1200,
      height: 900,
    },
  });
  const page = await browser.newPage();

  try {
    await login_to_seamless(page, CREDS);

    // Should be logged in now
    // await order_from_restaurant(page, RESTAURANT, ORDERS, NAMES);
    for (const order_set of order_sets) {
      await order_from_restaurant(page, order_set.restaurant, order_set.orders, order_set.names);
    }

    // Clear orders
  } catch (err) {
    console.log("Crashed with error", err);
  }

  if (!dry_run) {
    Orders.clear_orders();
    await browser.close();
  }
};

/**
 * Given a puppeteer page, logs into Seamless with the given credentials.
 */
const login_to_seamless = async (page, creds) => {
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
const order_from_restaurant = async (page, restaurant, orders, usernames) => {
  await page.goto(URLS.choose_rest);

  await page.select("#time", DEFAULT_TIME).catch(() => {});
  await page.click("tr.startorder a");
  await page.waitForNavigation();

  // Choose restaurant
  const rest_links = await page.$$("a[name=\"vendorLocation\"]");
  let our_rest;
  for (const anchor of rest_links) {
    const text = await page.evaluate(e => e.innerText, anchor);
    if (text.includes(restaurant)) our_rest = anchor;
  }
  await our_rest.click();
  await page.waitForNavigation();

  // Do the rest!
  await fill_orders(page, orders);
  await fill_names(page, usernames);

  // Fill [random] phone number
  const phone_numbers = usernames.map(u => Users.get_user(n).phone);
  const phone_number = phone_numbers[Math.floor(Math.random() * phone_numbers.length)];
  await page.$eval("input#phoneNumber", e => e.value = "");
  await page.click("input#phoneNumber");
  await page.keyboard.type(phone_number);

  // Submit order
  if (dry_run) {
    const confirmation_path = `${dirname}/confirmations/${sanitize_filename(restaurant)}.pdf`;
    await page.pdf(confirmation_path);
    console.log(`Simulated order from ${restaurant}, confirmation is in ${confirmation_path}`);
  } else {
    await page.click("a.findfoodbutton");
    await page.waitForNavigation();
    const confirmation_path = `${dirname}/confirmations/${sanitize_filename(restaurant)}.pdf`;
    await page.pdf({ path: confirmation_path });
    console.log(`Ordered from ${restaurant}, confirmation is in ${confirmation_path}`);
  }
};

/**
 * Given a page at the order stage, this function will add the given orders to
 * the cart.
 *
 * The orders parameter should be an array of this form:
 *   [
 *     [
 *       "dish",
 *       ["option 1", "option 2"],
 *     ],
 *     [
 *       "dish2",
 *       [],
 *     ],
 *   ]
 */
const fill_orders = async (page, orders) => {
  for (const [item, options] of orders) {
    // Click menu item
    const item_links = await page.$$("a[name=\"product\"]");
    let our_item;
    for (const anchor of item_links) {
      const text = await page.evaluate(e => e.innerText.toLowerCase(), anchor);
      if (text.includes(item.toLowerCase())) our_item = anchor;
    }
    await our_item.click();
    await page.waitFor(1500);

    // Select options
    const option_links = await page.$$("li label");
    for (const input of option_links) {
      const text = await page.evaluate(e => e.innerText.toLowerCase(), input);
      const is_selected = options.reduce((memo, o) => memo || text.includes(o.toLowerCase()), false);
      if (is_selected) await input.click();
    }

    // Click add to order
    await page.click("a#a1");
    await page.waitFor(2000);
  }

  await page.click("a.findfoodbutton");
  await page.waitForNavigation();
};

/**
 * Given a page at the checkout stage, this function will enter the given
 * usernames. The names parameter should be an array of tuples, where each
 * tuple contains the first and last names of all those involved in the order.
 */
const fill_names = async (page, usernames) => {
  // Clear existing names first
  while (await page.$("td.delete a")) {
    await page.click("td.delete a");
    await page.waitForNavigation();
  }

  for (const username of usernames) {
    const name = Users.get_user(username).name.split(" ");

    await page.click("p#RecentAllocations a");
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
const sanitize_filename = n => n.replace(NOT_ALPHAN_REGEX, "_").replace(/^_+|_+$/g, "");

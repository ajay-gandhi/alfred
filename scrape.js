
const puppeteer = require("puppeteer");
const fs = require("fs");
const creds = require("./creds");

const URLS = {
  login: "https://www.seamless.com/corporate/login/",
  choose_rest: "https://www.seamless.com/MealsVendorSelection.m",
};

const output_file = "data.json";

const TIME = "7:00 PM";
const FLOAT_REGEX = /[+-]?\d+(\.\d+)?/g;
const DRY_RUN = false;

(async () => {
  const browser = await puppeteer.launch({
    headless: !DRY_RUN,
    defaultViewport: {
      width: 1200,
      height: 900,
    },
  });
  const page = await browser.newPage();

  try {
    await login_to_seamless(page, creds);
    console.log("Logged in");
    // Should be logged in now

    await page.select("#time", TIME).catch(() => {});
    await page.click("tr.startorder a");
    await page.waitForNavigation();

    // See how many restaurants are there
    const menu_data = {};
    const num_restaurants = await page.$eval("div#options a.OtherLink", e => parseInt(e.innerText));
    console.log(`${num_restaurants} restaurants open`);
    for (let i = 0; i < num_restaurants; i++) {
      const data = await order_from_restaurant(page, i);
      if (data) {
        console.log(`  Scraped "${data.name}"`);
        menu_data[data.name] = data;
      }
    }

    console.log(`Writing to ${output_file}`);
    fs.writeFileSync(output_file, JSON.stringify(menu_data), "utf8");

    if (!DRY_RUN) {
      await browser.close();
    }
  } catch (err) {
    console.log("Crashed with error", err);
  }
})();

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
 * at the given restaurant with the given items for the given names.
 */
const order_from_restaurant = async (page, index) => {
  const data = {};

  await page.goto(URLS.choose_rest);

  // Choose restaurant
  const rest_links = await page.$$("a[name=\"vendorLocation\"]");

  // We've scraped all restaurants
  if (index >= rest_links.length) return false;

  await rest_links[index].click();
  await page.waitForNavigation();

  // Get restaurant metadata
  const restaurant_info = await page.$("div#restaurantinfo");
  data.name = await page.evaluate(e => e.querySelector("h1").innerText, restaurant_info);
  const description = await page.evaluate(e => e.innerText.split("\n").pop(), restaurant_info);
  data.delivery_min = description.match(FLOAT_REGEX).map(parseFloat).reduce((a, b) => a + b, 0);

  // Get menu items
  data.menu = [];
  const menu_trs = await page.$$("div#Menu tr");
  for (const tr of menu_trs) {
    const new_item = {};
    new_item.name = await page.evaluate(e => e.querySelector("div.MenuItemName").innerText, tr);
    new_item.price = await page.evaluate(e => parseInt(e.querySelector("td.price").innerText.substring(1)), tr);
    data.menu.push(new_item);
  }
  return data;
};

/**
 * Given a page at the order stage, this function will add the given orders to
 * the cart.
 *
 * The orders parameter should be an object of this form:
 *   {
 *     "dish":  ["option 1", "option 2"],
 *     "dish2": [], // No options
 *   }
 */
const fill_orders = async (page, orders) => {
  const orders_as_arrays = Object.entries(orders);
  for (const [item, options] of orders_as_arrays) {
    // Click menu item
    const item_links = await page.$$("a[name=\"product\"]");
    let our_item;
    for (const anchor of item_links) {
      const text = await page.evaluate(e => e.innerText.toLowerCase(), anchor);
      if (text.includes(item.toLowerCase())) our_item = anchor;
    }
    await our_item.click();
    await page.waitFor(1000);

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
 * Given a page at the checkout stage, this function will enter the given names.
 * The names parameter should be an array of tuples, where each tuple contains
 * the first and last names of all those involved in the order.
 */
const fill_names = async (page, names) => {
  for (const name of names) {
    await page.click("p#RecentAllocations a");
    await page.click("input#FirstName");
    await page.keyboard.type(name[0]);

    await page.click("input#LastName");
    await page.keyboard.type(name[1]);

    await page.click("tr#AddUser h4.PrimaryLink a");
    await page.waitForNavigation();
  }

  await page.click("td.delete a");
  await page.waitForNavigation();
};

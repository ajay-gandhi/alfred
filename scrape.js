
const puppeteer = require("puppeteer");
const fs = require("fs");
const creds = require("./creds");

const URLS = {
  login: "https://www.seamless.com/corporate/login/",
  choose_rest: "https://www.seamless.com/MealsVendorSelection.m",
};

const OUTPUT_FILE = process.argv[2] || "menu_data.json";

const TIME = "8:00 PM";
const FLOAT_REGEX = /[+-]?\d+(\.\d+)?/g;
const TESTING = false;

(async () => {
  const browser = await puppeteer.launch({
    headless: !TESTING,
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
      const data = await scrape_menu(page, i);
      if (data) {
        console.log(`  Scraped "${data.name}"`);
        menu_data[data.name] = data;
      }
    }

    console.log(`Writing to ${OUTPUT_FILE}`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(menu_data), "utf8");

    if (!TESTING) {
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
 * Given a page with a logged-in status, this function will scrape the menu
 * items for the restaurant at the given index.
 */
const scrape_menu = async (page, index) => {
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
  data.delivery_min = parseFloat(description.match(FLOAT_REGEX)[0]);

  // Get menu items
  data.menu = [];
  const menu_trs = await page.$$("div#Menu tr");
  for (const tr of menu_trs) {
    const new_item = {};
    new_item.name = await page.evaluate(e => e.querySelector("div.MenuItemName").innerText, tr);
    new_item.price = await page.evaluate(e => parseFloat(e.querySelector("td.price").innerText), tr);
    data.menu.push(new_item);
  }
  return data;
};

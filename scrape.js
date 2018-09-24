
const puppeteer = require("puppeteer");
const fs = require("fs");
const creds = require("./creds");

const URLS = {
  login: "https://www.seamless.com/corporate/login/",
  choose_rest: "https://www.seamless.com/MealsVendorSelection.m",
};

const OUTPUT_FILE = process.argv[2] || `${__dirname}/data/menu_data.json`;

const TIME = "7:00 PM";
const FLOAT_REGEX = /[+-]?\d+(\.\d+)?/g;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium-browser",
    defaultViewport: {
      width: 1200,
      height: 900,
    },
  });
  const page = await browser.newPage();

  try {
    await login_to_seamless(page, creds);
    console.log("Logged in");

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
        menu_data[data.name] = data;
        console.log("done");
      }

      // Give seamless a break every 5 restaurants smh
      if (i % 5 == 4) {
        process.stdout.write("Taking a break...");
        await page.waitFor(5000);
        console.log("resuming!\n");
      }
    }

    console.log(`Writing to ${OUTPUT_FILE}`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(menu_data), "utf8");
  } catch (err) {
    console.log("Crashed with error", err);
  }
  await browser.close();
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

  // Click and wait fails on RPI
  const url = await page.evaluate(e => e.href, rest_links[index]);
  await page.goto(url);

  // Get restaurant metadata
  const restaurant_info = await page.$("div#restaurantinfo");
  data.name = await page.evaluate(e => e.querySelector("h1").innerText, restaurant_info);
  process.stdout.write(`  Scraping "${data.name}"...`);

  const description = await page.evaluate(e => e.innerText.split("\n").pop(), restaurant_info);
  data.delivery_min = parseFloat(description.match(FLOAT_REGEX)[0]);

  // Get menu items
  data.menu = [];
  const menu_trs = await page.$$("div#Menu tr");
  for (const tr of menu_trs) {
    const new_item = {};
    new_item.name = await page.evaluate(e => e.querySelector("div.MenuItemName").innerText, tr);
    const floats = (await page.evaluate(e => e.querySelector("td.price").innerText, tr)).match(FLOAT_REGEX);
    new_item.price = floats ? parseFloat(floats[0]) : false;
    data.menu.push(new_item);
  }
  return data;
};

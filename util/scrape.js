/**
 * Scraper
 *
 * This script will scrape the data for all menus for each restaurant on
 * Seamless, and store the data persistently in the `data/` subdirectory.
 */

const puppeteer = require("puppeteer");
const MongoClient = require("mongodb").MongoClient;
const priv = require("../private");

let menu;
const client = new MongoClient(priv.mongoSrv, { useNewUrlParser: true });
client.connect((err) => {
  if (err) console.log("Error connecting to MongoDB:", err);
  menu = client.db(priv.mongoDbName).collection("menu");
});

const URLS = {
  login: "https://www.seamless.com/corporate/login/",
  chooseRest: "https://www.seamless.com/MealsVendorSelection.m",
};

const OUTPUT_FILE = process.argv[2] || `${__dirname}/../data/menu_data.json`;

const TIME = "7:00 PM";
const FLOAT_REGEX = /[+-]?\d+(\.\d+)?/g;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium-browser",
  });
  const page = await browser.newPage();

  try {
    await loginToSeamless(page, priv);
    console.log("Logged in");

    await page.select("#time", TIME).catch(() => {});
    await page.click("tr.startorder a");
    await page.waitForNavigation();

    // See how many restaurants are there
    const menuData = [];
    const numRestaurants = await page.$eval("div#options a.OtherLink", e => parseInt(e.innerText));
    console.log(`${numRestaurants} restaurants open`);

    for (let i = 0; i < numRestaurants; i++) {
      const data = await scrapeMenu(page, i);
      if (data) {
        menuData.push(data);
        console.log("done");
      }

      // Give seamless a break every 5 restaurants smh
      if (i % 5 == 4) {
        process.stdout.write("Taking a break...");
        await page.waitFor(5000);
        console.log("resuming!\n");
      }
    }

    console.log(`Writing to Mongo`);
    await menu.deleteMany({});
    await menu.insertMany(menuData);
  } catch (err) {
    console.trace(err);
  }
  await browser.close();
  process.exit(0);
})();

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
 * Given a page with a logged-in status, this function will scrape the menu
 * items for the restaurant at the given index.
 */
const OPTION_REGEX = /^([a-z0-9&*./_\-\\()'"`, ]+)( \(\$([0-9.]+)\))?$/i;
const scrapeMenu = async (page, index) => {
  const data = {};

  await page.goto(URLS.chooseRest);

  // Choose restaurant
  const restLinks = await page.$$("a[name=\"vendorLocation\"]");

  // We've scraped all restaurants (or more likely, there's a bug)
  // Overall, this case shouldn't really occur
  if (index >= restLinks.length) return false;

  // Click and wait fails on RPI, so we have to goto the href
  const url = await page.evaluate(e => e.href, restLinks[index]);
  await page.goto(url);

  // Get restaurant metadata
  const restaurantInfo = await page.$("div#restaurantinfo");
  data.name = await page.evaluate(e => e.querySelector("h1").innerText, restaurantInfo);
  process.stdout.write(`  Scraping "${data.name}"...`);

  const description = await page.evaluate(e => e.innerText.split("\n").pop(), restaurantInfo);
  data.deliveryMin = parseFloat(description.match(FLOAT_REGEX)[0]);

  // Get menu items
  data.menu = [];
  const menuTrs = await page.$$("div#Menu tr");
  let done = 0;
  const checkpoints = [20, 40, 60, 80];
  for (const tr of menuTrs) {
    const newItem = {};
    newItem.name = await page.evaluate(e => e.querySelector("div.MenuItemName").innerText, tr);
    const floats = (await page.evaluate(e => e.querySelector("td.price").innerText, tr)).match(FLOAT_REGEX);
    newItem.price = floats ? parseFloat(floats[0]) : 0;
    newItem.defaultOptions = [];

    // Options
    await page.evaluate(e => e.querySelector("a[name=\"product\"]").click(), tr);
    await page.waitForSelector("div#fixedTop");
    const optionElements = await page.$$("form#orderAttributes li");

    // Group options by their name attribute
    const optionSets = {};
    for (const optionEl of optionElements) {
      const inputData = await page.evaluate((e) => {
        const inp = e.querySelector("input");
        return {
          selected: inp.checked,
          name: inp.name,
          radio: inp.type.trim() === "radio",
        };
      }, optionEl);

      if (!optionSets[inputData.name]) {
        optionSets[inputData.name] = {
          name: inputData.name,
          radio: inputData.radio,
          options: [],
        };
      }

      const optionText = await page.evaluate(e => e.innerText.trim(), optionEl);
      const matches = OPTION_REGEX.exec(Transform.simplifyOption(optionText));
      const option = {
        name: matches[1],
        price: parseFloat(matches[3]) || 0,
        set: inputData.name,
      };

      optionSets[inputData.name].options.push(option);
      if (inputData.selected) newItem.defaultOptions.push(option);
    }
    newItem.optionSets = Object.values(optionSets);

    await page.click("a#TB_closeWindowButton");
    await page.waitFor(2000);

    data.menu.push(newItem);
    done++;
    if (done / menuTrs.length * 100 > checkpoints[0]) {
      process.stdout.write(`${checkpoints[0]}%...`);
      checkpoints.shift();
    }
  }
  return data;
};


/**
 * Replaces strange characters in options
 * See https://stackoverflow.com/a/37511463
 * Keep this function in sync with the operation in perform.js
 */
const simplifyOption = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

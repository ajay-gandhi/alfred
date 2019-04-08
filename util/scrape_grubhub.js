/**
 * Scraper
 *
 * This script will scrape the data for all menus for each restaurant on
 * Grubhub, and store the data persistently in the `data/` subdirectory.
 */

const puppeteer = require("puppeteer");
const MongoClient = require("mongodb").MongoClient;
const Menu = require("../models/menu");
const Transform = require("./transform");
const priv = require("../private");

const URLS = {
  login: "https://www.grubhub.com/login",
  chooseRest: "https://www.grubhub.com/lets-eat",
};
const ORDER_TIME = 1900; // 7:00pm
const NUM_CHECKPOINTS = 5;
const OPTION_REGEX = /^([a-zA-Z0-9&*.\/_%\-\\()'"`, ]+)( \+[ ]?\$([0-9.]+))?$/;
const DO_ALL = process.argv.reduce((m, a) => m || a === "--all", false);

(async () => {
  const browser = await puppeteer.launch({
    // executablePath: "/usr/bin/chromium-browser",
    // headless: false,
  });
  const page = await browser.newPage();

  try {
    await loginToGrubhub(page);
    console.log("Logged in");

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const restaurants = (await Menu.getAllMenus()).reduce((memo, { updated, name }) => {
      // No need to re-scrape restaurants scraped recently
      return (updated > yesterday && !DO_ALL) ? memo : memo.concat(name);
    }, []);
    console.log(`${restaurants.length} restaurants to scrape`);

    let successful = 0;
    const failed = [];
    const checkpoints = (new Array(NUM_CHECKPOINTS)).fill(0).map((e, i) => (i + 1) / NUM_CHECKPOINTS);
    for (let i = 0; i < restaurants.length; i++) {
      await goToRestaurant(page, restaurants[i]);
      const scrapeResult = await scrapeRestaurant(page, restaurants[i]);
      if (scrapeResult.successful) {
        await Menu.updateMenu(scrapeResult.data);
        successful++;
      } else {
        failed.push(scrapeResult);
      }

      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      if ((i + 1) / restaurants.length >= checkpoints[0]) {
        console.log(` => ${checkpoints.shift() * 100}% done`);
      }
    }

    console.log(`Successfully scraped ${successful} of ${restaurants.length} restaurants.`);
    if (failed.length > 0) {
      console.log("Failed restaurants:");
      failed.forEach(f => console.log(f.name, f.error));
    }
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.trace(err);
  }
})();

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
 * Given a restaurant name, visits that restaurant's page
 */
const goToRestaurant = async (page, name) => {
  await page.goto(URLS.chooseRest);
  await page.waitFor(1000);

  // Time
  await page.$eval("div.whenForSelector-btn", e => e.click());
  await page.waitFor(() => !!document.querySelector("section.s-dialog-body"));
  await page.waitFor(800);

  await page.select("section.s-dialog-body select", timeToString());
  await page.waitFor(500);
  await page.click("section.s-dialog-body button");
  await page.waitFor(() => !document.querySelector("section.s-dialog-body"));
  await page.waitFor(800);

  // Restaurant
  await page.click("div.startOrder-search-input input");
  await page.waitFor(300);
  await page.click("div.navbar-menu-search input");
  await page.keyboard.type(name);
  await page.waitFor(() => !!document.querySelector("section.search-autocomplete-container div.searchAutocomplete-xsFixed"));
  await page.waitFor(500);
  await page.click("div.ghs-autocompleteResult-container:first-child div.s-list-item-primary");
  await page.waitForNavigation();

  // Wait for items to appear
  await page.waitFor(() => document.querySelectorAll("div.menuItem").length > 0);
  await page.waitFor(1000);
};

/**
 * Given a link, scrapes the menu at that link
 */
const scrapeRestaurant = async (page, name) => {
  const data = {
    url: await page.url(),
    name,
    items: [],
  };
  const result = {
    name,
    successful: true,
  };
  console.log(`Scraping ${name}`);

  try {
    // Get all items, ignoring "Order Again" and "Most Popular" sections
    const itemBoxes = await page.$$("div.menuSection:not(.restaurant-order-history):not(.restaurant-favoriteItems) div.menuItem");
    for (let j = 0; j < itemBoxes.length; j++) {
      spinner(j);
      await itemBoxes[j].click();

      // Wait for name heading to appear
      await page.waitFor(() => !!document.querySelector(".menuItemModal-name"));
      await page.waitFor(1000);

      const item = { defaultOptions: [] };
      item.name = await page.$eval("h3.menuItemModal-name", e => e.textContent);
      item.price = await page.$eval("h5.menuItemModal-price", e => parseFloat(e.textContent.substring(1)));

      const optionElements = await page.$$("div[class=\"menuItemModal-choice-option\"]");
      const optionSets = {};
      for (const optionEl of optionElements) {
        // Scrape "meta"-data from the input element
        const inputData = await page.evaluate((e) => {
          const inp = e.querySelector("input");
          return {
            selected: inp.checked,
            name: inp.name,
            radio: inp.type.trim() === "radio",
          };
        }, optionEl);

        // Add an option set if DNE
        if (!optionSets[inputData.name]) {
          optionSets[inputData.name] = {
            name: inputData.name,
            radio: inputData.radio,
            options: [],
          };
        }

        const optionText = await page.evaluate(e => e.innerText.trim(), optionEl);
        const matches = OPTION_REGEX.exec(Transform.simplifyOption(optionText));
        if (!matches) console.log(optionText);
        const option = {
          name: matches[1],
          price: parseFloat(matches[3]) || 0,
          set: inputData.name,
        };

        optionSets[inputData.name].options.push(option);
        if (inputData.selected) item.defaultOptions.push(option);
      }

      item.optionSets = Object.values(optionSets);
      data.items.push(item);

      // Close modal and wait for it to disappear
      await page.click("nav.s-dialog--complex-nav button");
      await page.waitFor(() => !document.querySelector("header.s-dialog--complex-nav"));
      await page.waitFor(1000);
    }
    result.data = data;
  } catch (e) {
    console.log(e);
    result.successful = false;
    result.error = e;
  }
  return result;
};

/**
 * Display a loading spinner
 */
const spinner = (index) => {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write((new Array(index % 3 + 1)).fill(".").join(""));
};

/**
 * Converts the constant ORDER_TIME to a date ISO string
 */
const timeToString = () => {
  const now = new Date();
  now.setHours(Math.floor(ORDER_TIME / 100), ORDER_TIME % 100, 0, 0);
  return now.toISOString();
};

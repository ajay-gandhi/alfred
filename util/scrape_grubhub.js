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
  login: "https://www.grubhub.com/login",
  chooseRest: "https://www.grubhub.com/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV2&pageSize=20&hideHateos=true&searchMetrics=true&latitude=37.77037048&longitude=-122.38712311&facet=open_now%3Atrue&variationId=0.5-new-gotos&sortSetId=umamiV2&countOmittingTimes=true&whenFor=2019-03-13T00%3A30%3A00.000Z&isFutureOrder=true&sponsoredSize=3",
};

(async () => {
  const browser = await puppeteer.launch({
    // executablePath: "/usr/bin/chromium-browser",
    headless: false,
  });
  const page = await browser.newPage();

  try {
    await loginToGrubhub(page);
    console.log("Logged in");

    await page.goto(URLS.chooseRest);

    // Count restaurants and collect links
    const links = [];
    do {
      await page.waitFor(3000);
      const restaurants = await page.$$eval("div.restaurantCard-primaryInfo a.restaurant-name", a => a.map(b => b.href));
      Array.prototype.push.apply(links, restaurants);
      await page.click("ul.pagination li:nth-last-child(2)");
    } while (!await page.$eval("ul.pagination li:last-of-type", e => e.classList.contains("disabled")));
    console.log(`${links.length} restaurants found`);

    const menuData = [];
    const checkpoints = (new Array(10)).fill(0).map((e, i) => (i + 1) / 10);
    const checkpoints = [.2, .4, .6, .8, 1];
    for (let i = 0; i < links.length; i++) {
      await page.goto(links[i]);
      await page.waitFor(3000);

      const data = {};
      data.name = await page.$eval("div.restaurantSummary-info--redesign div.s-row", e => e.innerText.trim());
      data.items = await page.$$eval("div.menuSection:not(.restaurant-favoriteItems) div.menuItem", (items) => {
        return items.map((el) => {
          const name = el.querySelector("h6.menuItem-name").innerText;
          const price = parseFloat(el.querySelector("span.menuItem-displayPrice").innerText.substring(1));
          return { name, price };
        });
      });
      menuData.push(data);
      console.log(`  Scraped ${data.name}`);
      if (i / links.length > checkpoints[0]) {
        console.log(`=> ${checkpoints.shift() * 100}% done\n`);
      }
    }

    console.log("Writing to Mongo");
    await menu.deleteMany({});
    await menu.insertMany(menuData);
  } catch (err) {
    console.trace(err);
  }
  await browser.close();
  process.exit(0);
})();

const loginToGrubhub = async (page) => {
  await page.goto(URLS.login);

  await page.$eval("input[name=\"email\"]", (e, v) => e.value = v, priv.username);
  await page.$eval("input[name=\"password\"]", (e, v) => e.value = v, priv.password);

  await page.click("form.signInForm button");
  await page.waitForNavigation();
};

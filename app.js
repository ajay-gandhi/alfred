
const puppeteer = require("puppeteer");
const creds = require("./creds");

const URLS = {
  login: "https://www.seamless.com/corporate/login/",
  choose_rest: "https://www.seamless.com/UpdateMemberMealsStep2.m?vendorLocationId=46193&browseBy=OpenRestaurants&clickPage=DEFAULT&clickPageLocation=DEFAULT&clickRank=14&precedencePolicyId=",
};

const TIME = "10:00 PM";
const RESTAURANT = "Bamboo".toLowerCase();
const DISH = "Shioyaki".toLowerCase();
const NAME = ["Johan", "Augustine"];

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
  try {
    await page.goto(URLS.login);
    await page.screenshot({ path: "./seamless.png" });

    await page.click("input#username");
    await page.keyboard.type(creds.username);

    await page.click("input#password");
    await page.keyboard.type(creds.password);

    await page.click("a#submitLogin");
    await page.waitForNavigation();

    // Should be logged in now

    /* Choose time */
    await page.select("#time", TIME).catch(() => {});
    await page.click("tr.startorder a");
    await page.waitForNavigation();
    /* End */

    // Open the page for restaurant we want

    /* Choose restaurant */
    const rest_links = await page.$$("a[name=\"vendorLocation\"]");
    let our_rest;
    for (const anchor of rest_links) {
      const text = await page.evaluate(e => e.innerText.toLowerCase(), anchor);
      if (text.includes(RESTAURANT)) our_rest = anchor;
    }
    await our_rest.click();
    await page.waitForNavigation();
    /* End */

    // Add to order

    /* Choose items */
    // Click menu item
    const item_links  = await page.$$("a[name=\"product\"]");
    let our_item;
    for (const anchor of item_links) {
      const text = await page.evaluate(e => e.innerText.toLowerCase(), anchor);
      if (text.includes(DISH)) our_item = anchor;
    }
    await our_item.click();
    await page.waitFor(1000);

    // Click add to order
    await page.click("a#a1");
    await page.waitFor(2000);

    await page.click("a.findfoodbutton");
    await page.waitForNavigation();
    /* End */

    /* Add user */
    await page.click("td.delete a");
    await page.waitForNavigation();

    await page.click("input#FirstName");
    await page.keyboard.type(NAME[0]);

    await page.click("input#LastName");
    await page.keyboard.type(NAME[1]);

    await page.click("tr#AddUser h4.PrimaryLink a");
    await page.waitForNavigation();
    /* End */

    // Order!
    // await page.click("a.findfoodbutton");
    // await page.waitForNavigation();

    // await browser.close();
  } catch (err) {
    console.log("Crashed with error", err);
  }
})();

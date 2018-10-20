# Alfred

> Order food on Seamless corporate from Slack

Alfred is a little server that takes orders through a Slack webhook integration,
and places them on Seamless corporate.

## Todos

Things to do, in order of urgency:

* Adding tip to reach minimum
* Send confirmation at 3pm
* NLP
* Configurable time of delivery

## Layout

There are two main data flows in this implementation of Alfred. One is
synchronous, and is triggered by a message in Slack. The other is asynchronous,
and is triggered by a cronjob on my server at a fixed time each day.

### Synchronous

1. `Slack` User sends a message
2. `[server.js]` The message is posted to Alfred
3. `[parser.js]` The message is parsed into a command
4. `[recorder.js | users.js]` The server delegates the command, depending on the command
5. `[orders.js | users.js]` The appropriate file persists the data to the filesystem in a `.json` file
5. `[server.js]` The server returns confirmation text to Slack depending on the command

### Asynchronous

1. `Cronjob` At 5:30pm each weekday, a cronjob wakes up
2. `[cli.js]` The cronjob runs the CLI with the command "order"
3. `[perform.js]` The data files persisted earlier are read to input the order on Seamless
4. `[util/slack.js]` A message is sent to Slack containing links to confirmations of orders

*Other asynchronous events:*
* Daily passwords: This is to protect the confirmation PDFs, which can contain sensitive information. A cronjob runs `util/daily_tasks.js` every morning, and basic HTTP auth with the new password is required using `koa_confirmation_middleware.js`. The new password is sent to Slack when the orders are put in.
* Weekly scraping: Every week, menus are scraped from Seamless.

## Getting started

Alfred requires a recent version of Node.js (and npm) to run.

#### Installing the repo

Clone the repo into a directory of your choice.

Alfred uses a headless browser called [Puppeteer](http://pptr.dev) to perform its interactions with Seamless. Because Puppeteer runs on Chromium, running `npm install` will also download a version of `chromium-browser` that is most likely to be compatible with your OS.

Because I'm running Alfred on a Raspberry Pi, the puppeteer npm package doesn't come bundled with a version of chromium that is compatible. Therefore, I installed chromium on my own, and gave puppeteer a path to my version. If you also need to do this, run `npm install` as follows so that you don't unnecessarily download a copy of chromium:

```bash
$ PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install
$ sudo apt-get install chromium-browser
```
```js
# scrape.js
const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium-browser", # path to our installed version
  ...
});
```

_Note:_ Because I need to install chromium manually, I'm using Puppeteer v1.0.0, which is compatible with this version of chromium (65).

#### Adding private data

Add a file called `private.json` in the top level directory of the repo. The file should look something like this:

```json
{
  "username": "[Seamless corp username]",
  "password": "[Seamless corp password]",
  "slackIncomingToken": "[token for authing incoming post from Slack]",
  "slackOutgoingUrl": "[url for slack incoming webhook (outgoing from our server)]",
  "confUsername": "[static username to access confirmations]",
  "dailyPassword": "[daily updated password to access confirmations, this is autogenerated]"
}
```

#### Run the scraper

Running the scraper is a good way to test that you have everything working:

```bash
$ node scraper.js
```

The scraper will output messages as it moves along. Note that the scraper sets the time of its fake order to be 7pm, so you must run the scraper before 6pm (or change the time). 7pm was chosen because that is when all the restaurants on Seamless are open.

#### Run the server

Note that the server that runs only serves HTTP traffic - I *highly* recommend using SSL. I'm running Alfred behind a reverse proxy which handles the SSL portion.

Then, you can run the server:

```
$ node server.js [port]
```

The given argument is the port the server runs on.

#### Add crontabs

The last step is to add crontabs for Alfred to perform asynchronous functions. Add these crontabs by running `crontab -e`:

```
# This inputs the orders at 3:30pm (15:30) each weekday
# The argument to cli.js prevents the order input from being a "dry run"
30 15 * * 1-5 /path/to/node /path/to/alfred4.0/cli.js false

# Regenerate a daily password each weekday at midnight
# This also removes the confirmation PDFs from the previous day
0 0 * * 1-5 /path/to/node /path/to/alfred4.0/util/daily_tasks.js

# Scrape menus every week to stay up-to-date
0 0 * * 1 /path/to/node /path/to/alfred4.0/util/scrape.js
```

## Credits

* Format of Slack interactions taken from [lil-delhi-alfred](https://github.com/mithunm93/lil-delhi-alfred)

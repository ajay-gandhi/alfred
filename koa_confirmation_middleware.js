/**
 * This Koa module abstracts away the authentication and display of confirmation
 * PDFs.
 */

const fs = require("fs");
const auth = require("basic-auth");
const send = require("koa-send");
const logger = require("./logger")("kcm");

let { confUsername, dailyPassword } = require("./private");

module.exports = async (ctx, next) => {
  updateLocalCredentials();
  const credentials = auth(ctx.request);

  if (!credentials || credentials.name !== confUsername || credentials.pass !== dailyPassword) {
    ctx.response.status = 401;
    ctx.response.set("WWW-Authenticate", "Basic realm=\"alfred.ajay-gandhi.com\"")
    ctx.body = "Access denied";
  } else {
    logger.info(`Authenticated for ${ctx.path}`);
    await send(ctx, ctx.path, {
      root: __dirname + "/confirmations",
      extensions: ["pdf"],
    });
    await next();
  }
};

let lastUpdate = -1;
const updateLocalCredentials = () => {
  if (lastUpdate !== (new Date()).getDate()) {
    // Last update happened sometime other than today
    lastUpdate = (new Date()).getDate();
    const newCreds = JSON.parse(fs.readFileSync(`${__dirname}/private.json`, "utf8"));
    dailyPassword = newCreds.dailyPassword;
  }
};

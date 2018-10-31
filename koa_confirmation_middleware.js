/**
 * This Koa module abstracts away the authentication and display of confirmation
 * PDFs.
 */

const compose = require("koa-compose");
const auth = require("basic-auth");
const send = require("koa-send");

let { confUsername, dailyPassword } = require("./private");

module.exports = (LOG) => async (ctx, next) => {
  updateLocalCredentials();
  const credentials = auth(ctx.request);

  if (!credentials || credentials.name !== confUsername || credentials.pass !== dailyPassword) {
    ctx.response.status = 401;
    ctx.response.set("WWW-Authenticate", "Basic realm=\"alfred.ajay-gandhi.com\"")
    ctx.body = "Access denied";
  } else {
    LOG.log(`Authenticated for ${ctx.path}`);
    await send(ctx, ctx.path, {
      root: __dirname + "/confirmations",
      extensions: ["pdf"],
    });
    await next();
  }
};

let lastUpdate = -1;
updateLocalCredentials = () => {
  if (lastUpdate !== (new Date()).getDate()) {
    // Last update happened sometime other than today
    lastUpdate = (new Date()).getDate();
    const newCreds = require("./private");
    dailyPassword = newCreds.dailyPassword;
  }
};

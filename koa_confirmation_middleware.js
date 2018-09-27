/**
 * This Koa module abstracts away the authentication and display of confirmation
 * PDFs.
 */

const compose = require("koa-compose");
const auth = require("basic-auth");
const send = require("koa-send");

let { daily_username, daily_password } = require("./creds");

module.exports = () => async (ctx, next) => {
  updateLocalCredentials();
  const credentials = auth(ctx.request);

  if (!credentials || credentials.name !== daily_username || credentials.pass !== daily_password) {
    ctx.response.status = 401;
    ctx.response.set("WWW-Authenticate", "Basic realm=\"alfred.ajay-gandhi.com\"")
    ctx.body = "Access denied";
  } else {
    await send(ctx, ctx.path, { root: __dirname + '/confirmations' });
  }
};

let lastUpdate = new Date();
updateLocalCredentials = () => {
  if (lastUpdate.getDate() !== (new Date()).getDate()) {
    // Last update happened sometime other than today
    lastUpdate = new Date();
    { daily_username, daily_password } = require("./creds");
  }
};

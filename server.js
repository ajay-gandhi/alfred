
const https = require("https");
const fs = require("fs");
const Koa = require("koa");
const router = new (require("koa-router"))();

const Logger = require("../util/logger");

const Parser = require("./parser");
const Recorder = require("./recorder");
const Users = require("./users");
const { slackIncomingToken } = require("./creds");

const LOG = new Logger("alfred");
const PORT = process.argv[2] || 9002;

const app = new Koa();

app.use(require("koa-bodyparser")());
app.use(require("koa-mount")("/confirmations", require("koa-static")(`${__dirname}/confirmations`)));

app.use((ctx, next) => {
  LOG.log(`${ctx.method} ${ctx.url}`);
  next();
});

router.post("/command", (ctx, next) => {
  if (ctx.request.body.token !== slackIncomingToken) {
    LOG.log("Request does not have proper secret");
    return {};
  }
  if (!ctx.request.body.text || !ctx.request.body.user_name) {
    LOG.log("Request is missing username or text");
    return {};
  }

  const username = ctx.request.body.user_name;
  const parsed = Parser.parse(ctx.request.body.text);

  switch (parsed.command) {
    case "order": {
      const order = RecordOrders.addOrder(parsed.params.restaurant, parsed.params.items, username);
      const itemsList = order.correctedItems.map(i => i[0]).join(", ");
      ctx.body = { text: `Added ${itemsList} from ${order.restaurant}` };
      break;
    }

    case "forget": {
      const order = RecordOrders.forgetOrder(username);
      ctx.body = { text: `Removed order from ${order.restaurant}` };
      break;
    }

    case "info": {
      Users.addUser(username, parsed.params.name, parsed.params.phone);
      ctx.body = { text: `Added information for ${username}` };
      break;
    }

    default:
      ctx.body = "{}";
  }
  next();
});

app.use(router.routes());
app.use(router.allowedMethods());

app.use((ctx) => {
  if (ctx.body) LOG.log(`Responded with "${ctx.body.text}"`);
  ctx.body = JSON.stringify(ctx.body);
});

const httpsOpts = {
  key: fs.readFileSync(`${__dirname}/privkey.pem`).toString().trim(),
  cert: fs.readFileSync(`${__dirname}/fullchain.pem`).toString().trim(),
};
https.createServer(httpsOpts, app.callback()).listen(PORT, () => {
  LOG.log(`Server listening on port ${PORT}`);
});

/** Unencrypted server **/
const http = require("http");
const unencryptedApp = new Koa();
unencryptedApp.use(require("koa-static")(`${__dirname}/public`, { hidden: true }));
http.createServer(unencryptedApp.callback()).listen(9003, () => {
  LOG.log("Serving unencrypted traffic on port 9003");
});

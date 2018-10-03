
const fs = require("fs");
const Koa = require("koa");
const router = new (require("koa-router"))();

const Logger = require("../util/logger");
const LOG = new Logger("alfred");

const Parser = require("./parser");
const Recorder = require("./recorder");
const Users = require("./users");
const private = require("./private");

const app = new Koa();
const PORT = process.argv[2] || 9002;

app.use(require("koa-bodyparser")());

// Logging requests
app.use(async (ctx, next) => {
  LOG.log(`${ctx.method} ${ctx.url}`);
  await next();
});
app.use(require("koa-mount")("/confirmations", require("./koa_confirmation_middleware")()));

router.post("/command", (ctx, next) => {
  if (ctx.request.body.token !== private.slackIncomingToken) {
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
      if (isLate()) {
        ctx.body = { text: "Alfred has already ordered for today." };
        break;
      }
      if (!Users.getUser(username)) {
        ctx.body = { text: "Please register your info first." };
        break;
      }
      const order = Recorder.recordOrder(parsed.params.restaurant, parsed.params.items, username);
      const itemsList = order.correctedItems.map(i => i[0]).join(", ");
      ctx.body = { text: `Added ${itemsList} from ${order.restaurant}` };
      break;
    }

    case "forget": {
      if (isLate()) {
        ctx.body = { text: "Alfred has already ordered for today." };
        break;
      }
      if (!Users.getUser(username)) {
        ctx.body = { text: "Please register your info first." };
        break;
      }
      const order = Recorder.forgetOrder(username);
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

// Logging response
app.use(async (ctx, next) => {
  if (ctx.body && ctx.body.text) {
    LOG.log(`Responded with "${ctx.body.text}"`);
    ctx.body = JSON.stringify(ctx);
  }
  await next();
});

app.on("error", (err, ctx) => {
  LOG.log(err);
});

/************************** Initialize HTTPS server ***************************/

app.listen(PORT);
LOG.log(`Server listening on ${PORT}`);

/********************************** Helpers ***********************************/

// Returns true if it is past 3:30pm
const isLate = () => {
  const now = new Date();
  return now.getHours() > 15 || (now.getHours() > 14 && now.getMinutes() > 30)
};

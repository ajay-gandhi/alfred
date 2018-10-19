
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
  if (ctx.request.body.user_name === "slackbot") return {};

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
      if (!parsed.params.name || !parsed.params.phone) {
        const you = Users.getUser(username);
        ctx.body = { text: `${you.name}'s number is ${you.phone}.` };
      } else {
        Users.addUser(username, parsed.params.name, parsed.params.phone, ctx.request.body.user_id);
        ctx.body = { text: `Added information for ${username}` };
      }
      break;
    }

    case "help": {
      const text = "Hi, I'm Alfred! Make sure you enter your info before ordering.\n" +
        "```alfred info [name], [number]```\n" +
        "> `name` should be your name on Seamless\n" +
        "> `number` is the phone number you'll receive the call on if you're selected\n\n" +
        "```alfred order [dishes] from [restaurant]```\n" +
        "> `dishes` is a comma-separated list of the items you'd like to order.\n" +
        "> If you'd like to select / add options to a dish, add them them as a comma-separated list surrounded by square brackets `[]`\n" +
        "> `restaurant` is the name of the restaurant\n\n" +
        "```alfred forget```\n" +
        "> Forget today's order\n\n" +
        "Ordering ends at 3:30, and delivery time is selected for 5:30.";
      ctx.body = { text };
    }

    default: {
      ctx.body = { text: "Command not recognized. Try \`alfred help\`" };
    }
  }
  next();
});

app.use(router.routes());
app.use(router.allowedMethods());

// Logging response
app.use(async (ctx, next) => {
  if (ctx.body && ctx.body.text) {
    LOG.log(`Responded with "${ctx.body.text}"`);
    ctx.body = JSON.stringify(ctx.body);
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


const fs = require("fs");
const Koa = require("koa");
const router = new (require("koa-router"))();

const Logger = require("../util/logger");
const LOG = new Logger("alfred");

const Commander = require("./commander");

const app = new Koa();
const PORT = process.argv[2] || 9002;

app.use(require("koa-bodyparser")());

// Logging requests
app.use(async (ctx, next) => {
  LOG.log(`${ctx.method} ${ctx.url}`);
  await next();
});
app.use(require("koa-mount")("/confirmations", require("./koa_confirmation_middleware")()));

router.post("/command", Commander.do);

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

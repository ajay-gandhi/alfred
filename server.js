
const fs = require("fs");
const Koa = require("koa");
const router = new (require("koa-router"))();
const logger = require("./logger")("server");

const Commander = require("./commander");

const app = new Koa();
const PORT = process.argv[2] || 9002;

app.use(require("koa-bodyparser")());

// Logging requests
app.use(async (ctx, next) => {
  logger.info(`${ctx.method} ${ctx.url}`);
  await next();
});
app.use(require("koa-mount")("/confirmations", require("./koa_confirmation_middleware")));

router.post("/command", Commander.do);

app.use(router.routes());
app.use(router.allowedMethods());

// Logging response
app.use(async (ctx, next) => {
  if (ctx.body && ctx.body.text) {
    logger.info(`Responded with "${ctx.body.text}"`);
    ctx.body = JSON.stringify(ctx.body);
  }
  await next();
});

app.on("error", (err, ctx) => {
  logger.error(err);
});

/*************************** Initialize HTTP server ***************************/

app.listen(PORT);
logger.info(`Server listening on ${PORT}`);


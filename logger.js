const { createLogger, format, transports } = require("winston");

const logPrinter = format.printf(({ level, message, stack, file, timestamp }) => {
  let msg = message;
  if (message instanceof Error) {
    msg = message.stack;
  } else if (typeof message === "object") {
    msg = JSON.stringify(message, null, 2);
  }
  const lvl = level === "error" ? "ERROR" : level;
  return `${timestamp} [${file}] ${lvl}: ${msg}`;
});

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss"
    }),
    logPrinter,
  ),
  defaultMeta: { service: "alfred" },
});

if (process.stdin.isTTY) {
  // Log to console if dev
  logger.add(new transports.Console());
} else {
  const prefix = `${__dirname}/../../logs/`;
  logger.add(new transports.File({ filename: `${prefix}alfred-error.log`, level: "error" }));
  logger.add(new transports.File({ filename: `${prefix}alfred-combined.log` }));
}

module.exports = (file) => ({
  info:  m => logger.info(m, { file }),
  error: m => logger.error(m, { file }),
});

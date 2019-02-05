
const Slack = require("./slack");
(async () => {
  await Slack.sendBasicMessage("Alfred is open for business!");
  process.exit(0);
})();

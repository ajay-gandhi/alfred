/**
 * Takes input (from Slack or CLI) and performs the appropriate action
 */

const Logger = require("../util/logger");
const LOG = new Logger("alfred");

const Parser = require("./parser");
const Recorder = require("./recorder");
const Users = require("./users");
const Stats = require("./stats");
const Slack = require("./util/slack");
const private = require("./private");

module.exports.do = (ctx, next) => {
  if (ctx.request.body.token !== private.slackIncomingToken) {
    LOG.log("Request does not have proper secret");
    return;
  }
  if (!ctx.request.body.text || !ctx.request.body.user_name) {
    LOG.log("Request is missing username or text");
    return;
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

    case "stats": {
      if (parsed.params.restaurant) {
        const restaurant = Menu.findRestaurantByName(parsed.params.restaurant).name;
        const stats = Stats.getStatsForUserFromRestaurant(username, restaurant);
        const text = `Stats for ${Slack.atUser(username)} from ${restaurant}:\n${Slack.statsFormatter(stats)}`;
        ctx.body = { text };
      } else {
        const stats = Stats.getStatsForUser(username);
        const text = `General stats for ${Slack.atUser(username)}:\n${Slack.statsFormatter(stats)}`;
        ctx.body = { text };
      }
    }

    case "all-stats": {
      const stats = Stats.getGlobalStats();
      const text = `Global stats:\n${Slack.statsFormatter(stats)}`;
      ctx.body = { text };
    }

    case "help": {
      const text = "Hi, I'm Alfred! Make sure you enter you're info before ordering.\n" +
        "```alfred info {name}, {number}```\n" +
        "> `name` should be your name on Seamless\n" +
        "> `number` is the phone number you'll receive the call on if you're selected\n\n" +
        "```alfred order {dishes} from {restaurant}```\n" +
        "> `dishes` is a comma-separated list of the items you'd like to order.\n" +
        "> If you'd like to select / add options to a dish, add them them as a comma-separated list surrounded by square brackets `[]`\n" +
        "> `restaurant` is the name of the restaurant\n\n" +
        "```alfred forget```\n" +
        "> Forget today's order\n\n" +
        "```alfred full-help```\n" +
        "> See the complete list of commands\n\n" +
        "Ordering ends at 3:30, and delivery time is selected for 5:30.";
      ctx.body = { text };
      break;
    }

    case "full-help": {
      const text = "Hi, I'm Alfred! Make sure you enter you're info before ordering.\n" +
        "```alfred info {name}, {number}```\n" +
        "> `name` should be your name on Seamless\n" +
        "> `number` is the phone number you'll receive the call on if you're selected\n\n" +
        "```alfred order {dishes} from {restaurant}```\n" +
        "> `dishes` is a comma-separated list of the items you'd like to order.\n" +
        "> If you'd like to select / add options to a dish, add them them as a comma-separated list surrounded by square brackets `[]`\n" +
        "> `restaurant` is the name of the restaurant\n\n" +
        "```alfred forget```\n" +
        "> Forget today's order\n\n" +
        "```alfred stats [from {restaurant}]```\n" +
        "> See your stats, optionally specifying the restaurant\n\n" +
        "```alfred all-stats```\n" +
        "> See global stats\n\n" +
        "Ordering ends at 3:30, and delivery time is selected for 5:30.";
      ctx.body = { text };
      break;
    }

    default: {
      ctx.body = { text: "Command not recognized. Try \`alfred help\`" };
    }
  }
  next();
};

/********************************** Helpers ***********************************/

// Returns true if it is past 3:30pm
const isLate = () => {
  const now = new Date();
  return now.getHours() > 15 || (now.getHours() > 14 && now.getMinutes() > 30)
};

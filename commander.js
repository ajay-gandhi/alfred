/**
 * Takes input (from server or CLI) and performs the appropriate action
 */

const dfParse = require("./df_parse");
const Users = require("./models/users");
const Stats = require("./models/stats");
const Menu = require("./models/menu");
const Slack = require("./util/slack");
const Transform = require("./util/transform");
const Orders = require("./models/orders");
const logger = require("./logger")("commander");

const priv = require("./private");

module.exports.do = async (ctx, next) => {
  if (ctx.request.body.token !== priv.slackIncomingToken) {
    logger.info("Request does not have proper secret");
    return;
  }
  if (!ctx.request.body.text || !ctx.request.body.user_id) {
    logger.info("Request is missing slack ID or text");
    return;
  }
  if (ctx.request.body.user_name === "slackbot") return {};

  const username = ctx.request.body.user_name;
  const slackId = ctx.request.body.user_id;
  const you = await Users.getUser(slackId);
  const { command, args } = await dfParse(cleanPhone(ctx.request.body.text));
  logger.info(command);
  logger.info(args);
  switch (command) {
    case "Regular Order": {
      if (isLate()) {
        ctx.body = { text: "Alfred has already ordered for today." };
        break;
      }
      if (!you) {
        ctx.body = { text: "Please register your info first." };
        break;
      }

      const parsed = Transform.parseOrders(args["order"]);
      const restaurant = args["restaurant"] || (await Transform.guessRestaurant(parsed));
      if (restaurant) {
        const fixedItems = await Transform.correctItems(parsed, restaurant);
        const successfulItems = fixedItems.filter(i => i.outcome < 2);
        if (successfulItems.length > 0)
          await Orders.addOrder(restaurant, slackId, username, successfulItems);

        ctx.body = {
          text: `Here is your order from *${restaurant}*:`,
          attachments: Slack.formatItems(fixedItems),
        };
      } else {
        ctx.body = { text: "No restaurant chosen. Please reorder!" };
      }
      break;
    }

    case "Forget": {
      if (!you) {
        ctx.body = { text: "Please register your info first." };
        break;
      }

      if (args["forget-what"] === "info") {
        // Remove user
        await Users.removeUser(slackId);
        ctx.body = { text: `Information for ${Slack.atUser(slackId)} has been removed` };
      } else if (args["forget-what"] === "favorite" || args["forget-what"] === "fav") {
        // Remove favorite
        await Users.removeFavorite(slackId);
        ctx.body = { text: `Removed favorite for ${Slack.atUser(slackId)}` };
      } else {
        // Default forget order
        if (isLate()) {
          ctx.body = { text: "Alfred has already ordered for today." };
          break;
        }
        const order = await Orders.removeOrder(slackId);
        if (order) {
          ctx.body = { text: `Removed order from ${order.restaurant}` };
        } else {
          ctx.body = { text: "You don't have an order today." };
        }
      }
      break;
    }

    case "Order Favorite": {
      if (isLate()) {
        ctx.body = { text: "Alfred has already ordered for today." };
        break;
      }
      if (!you) {
        ctx.body = { text: "Please register your info first." };
        break;
      }

      if (!you.favorite) {
        ctx.body = { text: "No favorite order saved" };
      } else {
        await Orders.addOrder(you.favorite.restaurant, slackId, username, you.favorite.items);
        ctx.body = {
          text: `Here is your order from *${you.favorite.restaurant}*:`,
          attachments: Slack.formatItems(you.favorite.items),
        };
      }
      break;
    }

    case "List Restaurants": {
      const options = (await Menu.getAllMenus()).map(m => `* ${m.name}`).join("\n");
      ctx.body = { text: `Here are the restaurants you may order from:\n${options}` };
      break;
    }

    case "List Orders": {
      const restaurants = Object.values((await Orders.getOrders()).reduce((memo, order) => {
        if (!memo[order.restaurant]) {
          memo[order.restaurant] = {
            restaurant: order.restaurant,
            total: 0,
            participants: 0,
          };
        }

        memo[order.restaurant].participants++;
        memo[order.restaurant].total += order.items.reduce((m, i) => m + i.subtotal, 0);
        return memo;
      }, {}));

      if (restaurants.length === 0) {
        ctx.body = { text: "There are no orders today!" };
      } else {
        const attachments = restaurants.map((data) => {
          const isOver = data.total > data.participants * 25;
          const overText = isOver ? "\nThis order is over-budget." : "";

          return {
            title: data.restaurant,
            text: `Total: $${data.total.toFixed(2)}${overText}`,
            footer: `${data.participants} participant${data.participants === 1 ? "" : "s"}`,
            color: isOver ? "danger" : "#aaa",
          };
        });

        ctx.body = {
          text: `Here are today's orders:`,
          attachments,
        };
      }
      break;
    }

    case "Donate": {
      if (isLate()) {
        ctx.body = { text: "Alfred has already ordered for today." };
        break;
      }
      if (!args["restaurant"]) {
        ctx.body = { text: "Please specify a restaurant." };
        break;
      }

      await Orders.addOrder(args["restaurant"], slackId, username, [], true);
      ctx.body = { text: `Your money will be added to the ${args["restaurant"]} order. Thanks!` };
      break;
    }

    /*
    case "Get Menu": {
      if (!args["restaurant"]) {
        ctx.body = { text: "Please specify a restaurant." };
        break;
      }

      if (restaurant.error) {
        ctx.body = { text: restaurant.error };
      } else {
        const width = 8;
        const itemText = restaurant.menu.map((item) => {
          let priceText = item.price ? `$${item.price.toFixed(2)}` : "Unknown";
          while (priceText.length < width) priceText += " ";
          return `${priceText} ${item.name}`;
        }).join("\n");

        ctx.body = {
          text: [
            `Here's the menu for ${restaurant.name}:`,
            "```",
            `Delivery minimum: $${restaurant.deliveryMin.toFixed(2)}`,
            "",
            itemText,
            "```",
          ].join("\n")
        };
      }
      break;
    }
    */

    case "Announce": {
      if (!you) {
        ctx.body = { text: "Please register your info first." };
        break;
      }
      const yourOrder = await Orders.getOrderForUser(slackId);
      if (!yourOrder) {
        ctx.body = { text: "You don't have an order today." };
        break;
      }
      if (!yourOrder.isCallee) {
        ctx.body = { text: "You weren't the designated callee." };
        break;
      }

      const fellows = (await Orders.getOrders()).filter(o => o.restaurant === yourOrder.restaurant);
      const fellowsAts = fellows.map(f => Slack.atUser(f.slackId)).join(" ");
      ctx.body = { text: `Food from ${yourOrder.restaurant} is here! ${fellowsAts}` };
      break;
    }

    case "Set Favorite": {
      if (!you) {
        ctx.body = { text: "Please register your info first." };
        break;
      }

      const parsed = Transform.parseOrders(args["order"]);
      const restaurant = args["restaurant"] || (await Transform.guessRestaurant(parsed));
      if (restaurant) {
        const fixedItems = await Transform.correctItems(parsed, restaurant);
        const successfulItems = fixedItems.filter(i => i.outcome < 2);
        if (successfulItems.length > 0)
          await Users.saveFavorite(slackId, restaurant, successfulItems);

        ctx.body = {
          text: `Saved this order from *${restaurant}* as your favorite:`,
          attachments: Slack.formatItems(fixedItems),
        };
      } else {
        ctx.body = { text: "No restaurant chosen. Please reorder!" };
      }
      break;
    }

    case "Get": {
      if (args["get-what"] === "info") {
        // Show info
        if (!you) {
          ctx.body = { text: "No info saved." };
          break;
        }

        const innerText = [
          `Name:   ${you.name}`,
          `Number: ${you.phone}`,
        ];
        if (you.favorite) {
          const items = you.favorite.items.map(({ item, options }) => {
            return `${item.name}${options.length > 0 ? ` (${options.map(o => o.name).join(", ")})` : ""}`;
          }).join(", ");
          innerText.push(`\nFavorite: ${items} from ${you.favorite.restaurant}`);
        }

        ctx.body = { text: `${Slack.atUser(slackId)}'s info:\`\`\`${innerText.join("\n")}\`\`\`` };
      } else {
        if (!you) {
          ctx.body = { text: "Please register your info first." };
          break;
        }

        // Show current order
        const order = await Orders.getOrderForUser(slackId);
        if (order) {
          ctx.body = {
            text: `Here is your order from *${order.restaurant}*:`,
            attachments: Slack.formatItems(order.items),
          };
        } else {
          ctx.body = { text: "You haven't submitted an order for today." };
        }
      }
      break;
    }

    case "Set Info": {
      if (!args["given-name"] || !args["phone-number"]) {
        ctx.body = { text: "Please enter your name and phone number." };
        break;
      }
      const added = await Users.addUser(slackId, `${args["given-name"]} ${args["last-name"]}`, args["phone-number"], username);
      ctx.body = { text: `Added information for ${Slack.atUser(slackId)}:\`\`\`Name:   ${added.name}\nNumber: ${added.phone}\`\`\`` };
      break;
    }

    case "Stats": {
      if (args["stats-type"]) {
        // Global stats
        let errMsg = "";
        if (args["restaurant"]) {
          errMsg = "Global stats for specific restaurants isn't supported.\n";
        }
        const stats = await Stats.getGlobalStats();
        const text = `${errMsg}Global stats:\n${Slack.statsFormatter(stats)}`;
        ctx.body = { text };
      } else if (args["restaurant"]) {
          // Stats for user from restaurant
          const stats = await Stats.getStatsForUserFromRestaurant(slackId, args["restaurant"]);
          const text = `Stats for ${Slack.atUser(slackId)} from ${args["restaurant"]}:\n${Slack.statsFormatter(stats)}`;
          ctx.body = { text };
      } else {
        // General stats for user
        const stats = await Stats.getStatsForUser(slackId);
        const text = `General stats for ${Slack.atUser(slackId)}:\n${Slack.statsFormatter(stats)}`;
        ctx.body = { text };
      }
      break;
    }

    case "Help": {
      const egs = [
        "toppings for pizza",
        "how many wings",
        "which salad dressing",
        "how spicy to make your food",
      ];
      const eg = egs[Math.floor(egs.length * Math.random())];
      const text = "Hi, I'm Alfred! Ordering with me is easy:\n" +
        "1. Enter your information by telling Alfred your Grubhub name and phone number.\n" +
        "2. Order your items by telling Alfred what you want and from which restaurant.\n" +
        `Specify additional options (like ${eg}) by putting them in parentheses.\n` +
        "Alfred receives orders until 3:30, and each order is placed for 5:30.";
      ctx.body = { text };
      break;
    }

    case "Small Talk": {
      ctx.body = args;
      break;
    }

    default: {
      const unknown = [
        "I didn't get that.",
        "Command not recognized.",
        "Couldn't parse a command.",
      ];
      const tryHelp = Math.random() < 0.5 ? "" : " Try asking Alfred for help.";
      ctx.body = { text: `${unknown[Math.floor(unknown.length * Math.random())]}${tryHelp}` };
    }
  }
  return next();
};

/********************************** Helpers ***********************************/

// Returns true if it is past 3:30pm
const isLate = () => {
  const now = new Date();
  // return false;
  return now.getHours() > 15 || (now.getHours() > 14 && now.getMinutes() > 30)
};

// Removes Slack formatting for tel
const telTagRegex = /\<tel:[\(]?[0-9\-]*[\)]?\|[\(]?([0-9\-]*)[\)]?\>/;
const cleanPhone = text => text.replace(telTagRegex, "$1");

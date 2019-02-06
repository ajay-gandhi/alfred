/**
 * Takes input (from Slack or CLI) and performs the appropriate action
 */

const Logger = require("../util/logger");
const LOG = new Logger("alfred");

const dfParse = require("./df-parse");
const Users = require("./users");
const Stats = require("./stats");
const Slack = require("./util/slack");
const Transform = require("./util/transform");
const Orders = require("./orders");
const private = require("./private");

module.exports.do = async (ctx, next) => {
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
  const { command, args } = await dfParse(cleanPhone(ctx.request.body.text));
  LOG.log(command, args);
  switch (command) {
    case "Regular Order": {
      if (isLate()) {
        ctx.body = { text: "Alfred has already ordered for today." };
        break;
      }
      if (!await Users.getUser(username)) {
        ctx.body = { text: "Please register your info first." };
        break;
      }

      const fixed = fixRestaurantAndOrders(args["restaurant"], args["order"]);
      if (fixed.error) {
        ctx.body = { text: `${fixed.error} Please reorder!` };
      } else {
        Orders.addOrder(fixed.restaurantName, username, fixed.items);
        const itemList = fixed.items.map(i => i[0]).join(", ");
        const subtotal = computeSubtotal(fixed.restaurantName, fixed.items);
        ctx.body = {
          text: [
            `Added ${itemList} from ${fixed.restaurantName}.`,
            `Subtotal: $${subtotal.toFixed(2)}`,
          ].join("\n"),
        };
      }
      break;
    }

    case "Forget": {
      if (!await Users.getUser(username)) {
        ctx.body = { text: "Please register your info first." };
        break;
      }

      if (args["forget-what"] === "info") {
        // Remove user
        await Users.removeUser(username);
        ctx.body = { text: `Removed user ${username}` };
      } else if (args["forget-what"] === "favorite" || args["forget-what"] === "fav") {
        // Remove favorite
        await Users.removeFavorite(username);
        const slackAt = await Slack.atUser(username);
        ctx.body = { text: `Removed favorite for ${slackAt}` };
      } else {
        // Default forget order
        if (isLate()) {
          ctx.body = { text: "Alfred has already ordered for today." };
          break;
        }
        const order = Orders.removeOrder(username);
        ctx.body = { text: `Removed order from ${order.restaurant}` };
      }
      break;
    }

    case "Order Favorite": {
      if (isLate()) {
        ctx.body = { text: "Alfred has already ordered for today." };
        break;
      }
      if (!await Users.getUser(username)) {
        ctx.body = { text: "Please register your info first." };
        break;
      }

      const favorite = (await Users.getUser(username)).favorite;
      if (!favorite) {
        ctx.body = { text: "No favorite order saved" };
      } else {
        Orders.addOrder(favorite.restaurant, username, favorite.items);
        const itemList = favorite.items.map(i => i[0]).join(", ");
        ctx.body = { text: `Ordered ${itemList} from ${favorite.restaurant}` };
      }
      break;
    }

    case "Set Favorite": {
      if (!await Users.getUser(username)) {
        ctx.body = { text: "Please register your info first." };
        break;
      }

      const fixed = fixRestaurantAndOrders(args["restaurant"], args["order"]);
      if (fixed.error) {
        ctx.body = { text: `${fixed.error} Please re-enter!` };
      } else {
        await Users.saveFavorite(username, fixed.restaurantName, fixed.items);
        const itemList = fixed.items.map(i => i[0]).join(", ");
        ctx.body = { text: `Saved favorite as ${itemList} from ${fixed.restaurantName}` };
      }
      break;
    }

    case "Get": {
      if (!await Users.getUser(username)) {
        ctx.body = { text: "Please register your info first." };
        break;
      }

      if (args["get-what"] === "info") {
        // Show info
        const you = await Users.getUser(username);
        const innerText = [
          `Name:   ${you.name}`,
          `Number: ${you.phone}`,
        ];
        if (you.favorite) {
          const items = you.favorite.items.map((i) => {
            return i[1].length > 0 ? `${i[0]} (${i[1].join(", ")})` : i[0];
          }).join(", ");
          innerText.push(`\nFavorite: ${items} from ${you.favorite.restaurant}`);
        }

        const slackAt = await Slack.atUser(username);
        ctx.body = { text: `${slackAt}'s info:\`\`\`${innerText.join("\n")}\`\`\`` };
      } else {
        // Show current order
        const order = Orders.getOrders()[username];
        if (order) {
          const items = order.items.map((i) => {
            return i[1].length > 0 ? `${i[0]} (${i[1].join(", ")})` : i[0];
          }).join(", ");
          const text = `Your current order is ${items} from ${order.restaurant}`;
          ctx.body = { text };
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
      const you = await Users.addUser(username, `${args["given-name"]} ${args["last-name"]}`, args["phone-number"], ctx.request.body.user_id);
      const slackAt = await Slack.atUser(username);
      ctx.body = { text: `Added information for ${slackAt}:\`\`\`Name:   ${you.name}\nNumber: ${you.phone}\`\`\`` };
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
          const slackAt = await Slack.atUser(username);
          const restaurant = Transform.correctRestaurant(args["restaurant"]).name;
          const stats = await Stats.getStatsForUserFromRestaurant(username, restaurant);
          const text = `Stats for ${slackAt} from ${restaurant}:\n${Slack.statsFormatter(stats)}`;
          ctx.body = { text };
      } else {
        // General stats for user
        const slackAt = await Slack.atUser(username);
        const stats = await Stats.getStatsForUser(username);
        const text = `General stats for ${slackAt}:\n${Slack.statsFormatter(stats)}`;
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
        "1. Enter your information by telling Alfred your Seamless name and phone number.\n" +
        "2. Order your items by telling Alfred what you want and from which restaurant.\n" +
        `Specify additional options (like ${eg}) by putting them in parentheses.\n` +
        "Alfred receives orders until 3:30, and each order is placed for 5:30.";
      ctx.body = { text };
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

// Helper to call transform functions
const fixRestaurantAndOrders = (restaurantInput, orderInput) => {
  // Find correct restaurant
  if (!restaurantInput) return { error: "No restaurant chosen." };
  const restaurant = Transform.correctRestaurant(restaurantInput);
  if (restaurant.error) return { error: restaurant.error };

  // Fix items
  const items = Transform.parseOrders(orderInput, restaurant.name);
  if (items.error) return { error: items.error };

  return {
    restaurantName: restaurant.name,
    items: items.correctedItems,
  };
};

// Removes Slack formatting for tel
const telTagRegex = /\<tel:[\(]?[0-9\-]*[\)]?\|[\(]?([0-9\-]*)[\)]?\>/;
const cleanPhone = text => text.replace(telTagRegex, "$1");

// Compute subtotal for order
const computeSubtotal = (restaurantName, items) => {
  return items.reduce((sub, item) => {
    return sub + Transform.findCorrectItem(restaurantName, item[0]).price;
  }, 0);
};

/**
 * Module for transforming data
 *
 * This file contains functions that take in data and return the same data in a
 * different format. Some functions may use other external tools, such as menu
 * data.
 */

const FuzzAldrin = require("fuzzaldrin");
const MenuData = require("../data/menu_data");
const Levenshtein = require("fast-levenshtein");

/**
 * Orders data is stored persistently in a JSON hash keyed by username, with the
 * value being a hash containing the restaurant and items. This allows for easy
 * overwriting and removing of orders.
 *
 * When inputting the order on Seamless, it's necessary to group orders by
 * restaurant. This function transforms the hash defined above to an array of
 * objects, containing the restaurant and an array of objects containing the
 * username and the items they ordered.
 */
module.exports.indexByRestaurantAndUser = (data) => {
  return Object.values(data.reduce((memo, order) => {
    if (!memo[order.restaurant]) {
      memo[order.restaurant] = {
        restaurant: order.restaurant,
        users: [],
      };
    }

    memo[order.restaurant].users.push({
      username: order.username,
      items: order.items,
    });
    return memo;
  }, {}));
};

/**
 * Uses menu data to convert an inputted restaurant to the correct name
 */
const restaurantNames = Object.keys(MenuData);
module.exports.correctRestaurant = (restInput) => {
  // Convert restaurant to official name
  const matches = FuzzAldrin.filter(restaurantNames, restInput);
  if (matches.length === 0) {
    return { error: `Couldn't find restaurant called "${restInput}".` };
  } else {
    return MenuData[matches[0]];
  }
};

/**
 * Given a string containing a list of orders and a restaurant, parses out the
 * items and corrects them
 */
module.exports.parseOrders = (input, restaurantName) => {
  const parts = [""];
  let parenCount = 0;
  const delimiters = [", and", ",and", " and ", ", ", ","];
  for (let i = 0; i < input.length; i++) {
    // Don't want to split within parentheses
    if (input[i] === "(") {
      parenCount++;
    } else if (input[i] === ")") {
      parenCount--;
    } else {
      for (let j = 0; j < delimiters.length; j++) {
        if (input.substring(i, i + delimiters[j].length) === delimiters[j] && parenCount === 0) {
          parts.push("");
          i += delimiters[j].length;
          break;
        }
      }
    }
    parts[parts.length - 1] += input[i];
  }

  return transformOrders(parts.reduce((m, e) => e ? m.concat(e.trim()) : m, []), restaurantName);
};

/**
 * Given a corrected restaurant name and item, finds the closest matching item
 */
const findCorrectItem = (restaurantName, itemName) => {
  const menu = MenuData[restaurantName].menu;
  const matches = FuzzAldrin.filter(menu, itemName, { key: "name" });
  return matches.length === 0 ? false : matches[0];
};
module.exports.findCorrectItem = findCorrectItem;

/********************************** Helpers ***********************************/

// Remove leading "X. "
const friendlizeItem = i => i.replace(/^[\w]{1,3}\. /, "");

// Parse out options
const ARTICLE_REGEX = /^(?:(the|a|an|some) +)/;
const OPTIONS_REGEX = /\((.*)\)/;
const transformOrders = (items, restaurantName) => {
  const errorItems = [];
  const correctedItems = items.map((origItem) => {
    const item = origItem.replace(ARTICLE_REGEX, "");
    // First parse out options
    const matchedOptions = item.match(OPTIONS_REGEX);
    const formattedItem = [];
    if (matchedOptions) {
      const options = matchedOptions[1].split(",").map(o => o.trim());
      formattedItem.push(item.slice(0, item.indexOf("(")).trim());
      formattedItem.push(options);
    } else {
      formattedItem.push(item);
      formattedItem.push([]);
    }

    // Correct item name
    const correctedItem = findCorrectItem(restaurantName, formattedItem[0]);
    if (correctedItem) {
      formattedItem[0] = correctedItem.name;
    } else {
      errorItems.push(formattedItem[0]);
    }
    return formattedItem;
  });

  if (errorItems.length > 0) {
    const itemNoun = errorItems.length === 1 ? "item" : "items";
    const items = errorItems.map(i => `"${i}"`).join(", ");

    // Find closest match to first unknown item
    const lMatch = MenuData[restaurantName].menu.reduce((memo, item) => {
      if (Levenshtein.get(item.name, errorItems[0]) < memo.score) {
        return {
          name: item.name,
          score: Levenshtein.get(item.name, errorItems[0]),
        };
      } else {
        return memo;
      }
    }, {
      score: Number.MAX_SAFE_INTEGER,
    });
    const didYouMean = lMatch.score < 20 ? ` Did you mean "${lMatch.name}"?` : "";

    return { error: `Couldn't find ${itemNoun} called ${items}.${didYouMean}` };
  }
  return { correctedItems };
};


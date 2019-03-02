/**
 * Module for transforming data
 *
 * This file contains functions that take in data and return the same data in a
 * different format. Some functions may use other external tools, such as menu
 * data.
 */

const FuzzAldrin = require("fuzzaldrin");
const MongoClient = require("mongodb").MongoClient;
const Levenshtein = require("fast-levenshtein");
const Menu = require("../models/menu");

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
  const newData = data.reduce((memo, order) => {
    if (!memo[order.restaurant]) {
      memo[order.restaurant] = {
        restaurant: order.restaurant,
        users: [],
      };
    }

    memo[order.restaurant].users.push({
      username: order.username,
      items: order.items,
      isDonor: order.isDonor,
    });
    return memo;
  }, {});

  // Remove donor-only restaurants
  Object.keys(newData).forEach((restaurant) => {
    const isDonorOnly = newData[restaurant].users.reduce((m, o) => m && o.isDonor, true);
    if (isDonorOnly) delete newData[restaurant];
  });

  return Object.values(newData);
};

/**
 * Given a string containing a list of orders and a restaurant, parses out the
 * items and options
 */
const ARTICLE_REGEX = /^(?:(the|a|an|some) +)/;
const OPTIONS_REGEX = /\((.*)\)/;
module.exports.parseOrders = (input) => {
  const parts = [""];
  let parenCount = 0;
  const delimiters = [", and", ",and", " and ", ", ", ","];

  // Separate items
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
  const filteredParts = parts.filter(p => p);

  // Parse out options
  return filteredParts.map((part) => {
    const item = part.trim().replace(ARTICLE_REGEX, "");

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
    return formattedItem;
  });
};

/**
 * Given a parsed set of orders, correct items or return errors
 */
module.exports.correctItems = async (orders, restaurantName) => {
  const errorItems = [];
  const correctedItems = await Promise.all(orders.map(async ([name, options]) => {
    const correctedItem = await findCorrectItem(restaurantName, name);
    if (correctedItem) {
      return [correctedItem.name, options];
    } else {
      // No need to return anything since we won't use this array anyway
      errorItems.push(name);
    }
  }));

  if (errorItems.length > 0) {
    const itemNoun = errorItems.length === 1 ? "item" : "items";
    const items = errorItems.map(i => `"${i}"`).join(", ");

    // Find closest match to first unknown item
    const lMatch = (await Menu.getMenu(restaurantName)).menu.reduce((memo, item) => {
      if (Levenshtein.get(item.name, errorItems[0]) < memo.score) {
        return {
          name: item.name,
          score: Levenshtein.get(item.name, errorItems[0]),
        };
      } else {
        return memo;
      }
    }, {
      name: "",
      score: Number.MAX_SAFE_INTEGER,
    });
    const autocorrectName = lMatch.name.replace(/[()]/g, "");
    // Only show did you mean if they're close enough
    const didYouMean = lMatch.score < 20 ? ` Did you mean "${autocorrectName}"?` : "";

    return { error: `Couldn't find ${itemNoun} called ${items}.${didYouMean}` };
  } else {
    return { correctedItems };
  }
};

/********************************** Helpers ***********************************/

/**
 * Given a corrected restaurant name and item, finds the closest matching item
 */
const findCorrectItem = async (restaurantName, itemName) => {
  const items = (await Menu.getMenu(restaurantName)).menu;
  const matches = FuzzAldrin.filter(items, itemName, { key: "name" });
  return matches.length === 0 ? false : matches[0];
};


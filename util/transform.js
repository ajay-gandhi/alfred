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
 * Orders data is stored persistently in a JSON hash keyed by slack ID, with the
 * value being a hash containing the restaurant and items. This allows for easy
 * overwriting and removing of orders.
 *
 * When inputting the order on Seamless, it's necessary to group orders by
 * restaurant. This function transforms the hash defined above to an array of
 * objects, containing the restaurant and an array of objects containing the
 * slack ID and the items they ordered.
 *
 * It also maps the items into a 2D array that is more easily iterated over.
 */
module.exports.indexByRestaurantAndUser = (data) => {
  const newData = data.reduce((memo, order) => {
    if (!memo[order.restaurant]) {
      memo[order.restaurant] = {
        restaurant: order.restaurant,
        users: [],
      };
    }

    const simplifiedItems = order.items.map(({ item, options }) => {
      return [item.name, options.filter(o => o.successful).map(o => o.name)];
    });
    memo[order.restaurant].users.push({
      slackId: order.slackId,
      username: order.username,
      items: simplifiedItems,
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

  const items = (await Menu.getMenu(restaurantName)).items;
  return await Promise.all(orders.map(async ([itemName, options]) => {
    const result = {};

    // Find correct item
    const correctedItem = findCorrectObject(items, itemName);
    if (correctedItem) {
      result.outcome = 0;
      result.item = {
        name: correctedItem.name,
      };

      // Correct options
      // 1. Iterate through option sets, pulling options which match (removing from options array)
      //    - For radio-type options, pull the first match and ignore the rest
      // 2. Compute price and override defaults
      result.options = [];
      for (const optionSet of correctedItem.optionSets) {
        if (optionSet.radio) {
          for (const optionName of options) {
            const correctedOption = findCorrectObject(optionSet.options, optionName);
            if (correctedOption) {
              options.splice(options.indexOf(optionName), 1);
              result.options.push({
                name: correctedOption.name,
                price: correctedOption.price,
                successful: true,
              });

              // Remove any defaults for this option set
              correctedItem.defaultOptions = correctedItem.defaultOptions.filter((o) => {
                return o.set !== correctedOption.set;
              });

              // Since this option set is a radio input, only take first selection
              break;
            }
          }
        } else {
          for (let i = 0; i < options.length; i++) {
            const correctedOption = findCorrectObject(optionSet.options, options[i]);
            if (correctedOption) {
              options.splice(options.indexOf(options[i]), 1);
              i--; // Otherwise we'll skip one
              result.options.push({
                name: correctedOption.name,
                price: correctedOption.price,
                successful: true,
              });
            }
          }
        }
      }

      // Compute subtotal
      result.subtotal = correctedItem.price
        + result.options.reduce((m, o) => m + o.price, 0)
        + correctedItem.defaultOptions.reduce((m, o) => m + o.price, 0);

      // Any remaining inputted options are invalid options
      result.options = result.options.concat(options.map((o) => ({
        name: o,
        price: 0,
        successful: false,
      })));
      result.outcome = options.length > 0 ? 1 : 0;
    } else {
      // Failed to find item
      result.outcome = 2;
      result.item = {
        name: itemName,
        price: 0,
        suggestion: findSuggestedItem(items, itemName),
      };
    }
    return result;
  }));
};

/**
 * Given a parsed set of orders, attempt to guess which restaurant they're from
 */
module.exports.guessRestaurant = async (orders, restaurantName) => {
  const menus = await Menu.getAllMenus();

  // See which menu matches the most items
  const mostMatch = menus.reduce((memo, { name, items }) => {
    const matchingItems = orders.reduce((total, [itemName, options]) => {
      return findCorrectObject(items, itemName) ? total + 1 : total;
    }, 0);

    return matchingItems > memo.matchingItems ? { matchingItems, name } : memo;
  }, {
    matchingItems: 0,
    name: false,
  });

  return mostMatch.name;
};

/**
 * This function does 3 things:
 *   Replaces strange characters in options
 *   Removes not-significant info like copyright symbols
 *   Parses the given text into an option name and price (if exists)
 * See https://stackoverflow.com/a/37511463
 */
const OPTION_REGEX = /^([a-zA-Z0-9&*.\/_%\-\\()'"`, ]+)( \+[ ]?\$([0-9.]+))?$/;
module.exports.parseOption = (optionText) => {
  const cleaned = optionText
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9&*.+$\/_%\-\\()'"`, ]/g, "");
  const matches = OPTION_REGEX.exec(cleaned);
  return {
    name: matches[1],
    price: matches[3] ? parseFloat(matches[3]) : 0,
  };
};

/********************************** Helpers ***********************************/

/**
 * Chooses the closest matching object from the given list of choices
 */
const findCorrectObject = (choices, name) => {
  const matches = FuzzAldrin.filter(choices, name, { key: "name" });
  return matches.length === 0 ? false : matches[0];
};

/**
 * Suggests an item using Levenshtein
 */
const findSuggestedItem = (choices, name) => {
  const lMatch = choices.reduce((memo, item) => {
    const thisScore = Levenshtein.get(item.name, name);
    return thisScore < memo.score ? { name: item.name, score: thisScore } : memo;
  }, {
    name: "",
    score: Number.MAX_SAFE_INTEGER,
  });

  // Only want to suggest something if they're sufficiently close
  if (lMatch.score < 20) {
    return lMatch.name.replace(/[()]/g, "");
  } else {
    return false;
  }
};


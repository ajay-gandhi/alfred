/**
 * Module for transforming data
 *
 * This file contains functions that take in data and return the same data in a
 * different format. Some functions may use other external tools, such as menu
 * data.
 */

const FuzzAldrin = require("fuzzaldrin");
const MenuData = require("../data/menu_data");

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
  const newData = {};

  const usernames = Object.keys(data);
  for (const username of usernames) {
    const restaurant = data[username].restaurant;
    if (!newData[restaurant]) {
      newData[restaurant] = {
        restaurant,
        users: [],
      };
    }

    newData[restaurant].users.push({
      username,
      items: data[username].items,
    });
  }

  return Object.values(newData);
};

/**
 * Uses menu data to convert an inputted restaurant to the correct name
 */
const restaurantNames = Object.keys(MenuData);
module.exports.correctRestaurant = (restInput) => {
  // Convert restaurant to official name
  const matches = FuzzAldrin.filter(restaurantNames, restInput);
  if (matches.length === 0) {
    return { error: `Couldn't find restaurant called "${restInput}"` };
  } else {
    return MenuData[matches[0]];
  }
};

/**
 * Given a string containing a list of orders and a restaurant, parses out the
 * items and corrects them
 */
module.exports.parseOrders = (input, r) => {
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

  return transformOrders(parts.reduce((m, e) => e ? m.concat(e.trim()) : m, []), r);
};

/********************************** Helpers ***********************************/

// Remove leading "X. "
const friendlizeItem = i => i.replace(/^[\w]{1,3}\. /, "");

// Use menu data to correct item
const findCorrectItem = (restaurantName, itemName) => {
  const menu = MenuData[restaurantName].menu;
  const matches = FuzzAldrin.filter(menu, itemName, { key: "name" });
  return matches.length === 0 ? false : matches[0];
};

// Parse out options
const OPTIONS_REGEX = /\((.*)\)/;
const transformOrders = (items, restaurantName) => {
  const errors = [];
  const correctedItems = items.map((item) => {
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
      errors.push(formattedItem[0]);
    }
    return formattedItem;
  });

  if (errors.length > 0) {
    const itemNoun = errors.length === 1 ? "item" : "items";
    const items = errors.map(i => `"${i}"`).join(", ");
    return { error: `Couldn't find ${itemNoun} called ${items}` };
  }
  return { correctedItems };
};

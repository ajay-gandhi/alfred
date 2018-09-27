/**
 * Recorder module
 *
 * Records orders to the persisten orders file. Using data from scraped menus,
 * it also corrects names.
 */

const Orders = require("./orders");
const Menu = require("./menu");

module.exports.recordOrder = (restInput, items, username) => {
  // Convert restaurant to official name
  const restaurantData = Menu.findRestaurantByName(restInput);
  const restaurant = restaurantData.name;

  // Add items to order while completing names
  const correctedItems = items.map(([ itemName, options ]) => {
    const item = Menu.findItemByName(restaurant, itemName);
    return [friendlizeItem(item.name), options];
  });

  Orders.addOrder(restaurant, username, correctedItems);

  return { restaurant, correctedItems };
};

module.exports.forgetOrder = Orders.removeOrder;

// Remove leading "X. "
const friendlizeItem = i => i.replace(/^[\w]{1,3}\. /, "");

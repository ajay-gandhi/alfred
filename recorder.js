
const Orders = require("./orders");
const Menu = require("./menu");

module.exports.recordOrder = (restInput, items, username) => {
  // Convert restaurant to official name
  const restaurantData = Menu.find_restaurant_by_name(restInput);
  const restaurant = restaurantData.name;

  // Add items to order while completing names
  const correctedItems = items.map(([ itemName, options ]) => {
    const item = Menu.find_item_by_name(restaurant, itemName);
    return [friendlizeItem(item.name), options];
  });

  Orders.addOrder(restaurant, username, correctedItems);

  return { restaurant, correctedItems };
};

module.exports.forgetOrder = Orders.removeOrder;

// Remove leading "X. "
const friendlizeItem = i => i.replace(/^[\w]{1,3}\. /, "");

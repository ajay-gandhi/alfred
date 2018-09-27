
const Orders = require("./orders");
const Menu = require("./menu");

module.exports.addOrder = (rest_input, items, username) => {
  // Convert restaurant to official name
  const restaurant_data = Menu.find_restaurant_by_name(rest_input);
  const restaurant = restaurant_data.name;

  // Add items to order while completing names
  const corrected_items = items.map(([ item_name, options ]) => {
    const item = Menu.find_item_by_name(restaurant, item_name);
    return [friendlize_item(item.name), options];
  });

  Orders.addOrder(restaurant, username, corrected_items);

  return { restaurant, corrected_items };
};

module.exports.removeOrder = Orders.removeOrder;

// Remove leading "X. "
const friendlize_item = i => i.replace(/^[\w]{1,3}\. /, "");

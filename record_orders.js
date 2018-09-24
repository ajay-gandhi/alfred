
const Orders = require("./orders");
const Menu = require("./menu");

module.exports.add_order = (rest_input, items, username) => {
  // Convert restaurant to official name
  const restaurant_data = Menu.find_restaurant_by_name(rest_input);
  const restaurant = restaurant_data.name;

  // Add items to order while completing names
  const corrected_items = items.map(([ item_name, options ]) => {
    const item = Menu.find_item_by_name(restaurant, item_name);
    return [item.name, options];
  });

  Orders.add_order(restaurant, username, items);
  return true;
};

module.exports.remove_order = Orders.remove_order;


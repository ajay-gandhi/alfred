
const MENU_DATA = require("./menu_data");
const REST_NAMES = Object.keys(MENU_DATA);

/**
 * Fuzzy search for a restaurant with rest_name
 */
module.exports.find_restaurant_by_name = (rest_name) => {
  return REST_NAMES.reduce((memo, name) => {
    if (name.toLowerCase().includes(rest_name.toLowerCase())) {
      return MENU_DATA[name];
    } else {
      return memo;
    }
  }, {});
};

/**
 * Fuzzy search for an item with item_name at the given restaurant.
 *
 * Assumes restaurant is proper, i.e. returned from find_restaurant_by_name
 */
module.exports.find_item_by_name = (restaurant, item_name) => {
  const menu = MENU_DATA[restaurant].menu;
  return menu.reduce((memo, item) => {
    if (item.name.toLowerCase().includes(item_name.toLowerCase())) {
      return item;
    } else {
      return memo;
    }
  }, {});
};

/**
 * Re-formats the orders from the format in orders.json to the format used here
 */
module.exports.extract_orders_and_names = (data) => {
  const new_data = [];

  const restaurants = Object.keys(data);
  for (const restaurant of restaurants) {
    const order_set = { restaurant };
    order_set.names = Object.keys(data[restaurant]).map(n => n.split(" "));
    order_set.orders = Object.keys(data[restaurant]).map(n => data[restaurant][n]).reduce((m, l) => m.concat(l), []);
    new_data.push(order_set);
  }

  return new_data;
};

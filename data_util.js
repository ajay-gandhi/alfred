
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

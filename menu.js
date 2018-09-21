/**
 * Interface for scraped menu data
 */

const MenuData = require("./data/menu_data");
const RestaurantNames = Object.keys(MenuData);

/**
 * Fuzzy search for a restaurant with rest_name
 */
module.exports.find_restaurant_by_name = (rest_name) => {
  return RestaurantNames.reduce((memo, name) => {
    if (name.toLowerCase().includes(rest_name.toLowerCase())) {
      return MenuData[name];
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
  const menu = MenuData[restaurant].menu;
  return menu.reduce((memo, item) => {
    if (item.name.toLowerCase().includes(item_name.toLowerCase())) {
      return item;
    } else {
      return memo;
    }
  }, {});
};

/**
 * Interface for scraped menu data
 */

const MenuData = require("./data/menu_data");
const RestaurantNames = Object.keys(MenuData);

/**
 * Fuzzy search for a restaurant with restName
 */
module.exports.findRestaurantByName = (restName) => {
  return RestaurantNames.reduce((memo, name) => {
    if (name.toLowerCase().includes(restName.toLowerCase())) {
      return MenuData[name];
    } else {
      return memo;
    }
  }, {});
};

/**
 * Fuzzy search for an item with itemName at the given restaurant.
 *
 * Assumes restaurant is proper, i.e. returned from findRestaurantByName
 */
module.exports.findItemByName = (restaurant, itemName) => {
  const menu = MenuData[restaurant].menu;
  return menu.reduce((memo, item) => {
    if (item.name.toLowerCase().includes(itemName.toLowerCase())) {
      return item;
    } else {
      return memo;
    }
  }, {});
};

/**
 * Module for scraped menu data
 *
 * This file contains functions that abstract interactions with the data
 * scraped from Seamless.
 */

const MenuData = require("./data/menu_data");
const RestaurantNames = Object.keys(MenuData);

/**
 * Fuzzy search for a restaurant with given name
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
 * Fuzzy search for an item with given name at the given restaurant.
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

/**
 * Module for transforming data
 */

/**
 * Transforms the orders from the format in orders.json to the format used in
 * perform_orders
 */
module.exports.extractOrdersAndNames = (data) => {
  const newData = {};

  const usernames = Object.keys(data);
  for (const username of usernames) {
    const restaurant = data[username].restaurant;
    if (!newData[restaurant]) {
      newData[restaurant] = {
        restaurant,
        names: [],
        items: [],
      };
    }

    newData[restaurant].names.push(username);
    newData[restaurant].items = newData[restaurant].items.concat(data[username].items);
  }

  return Object.values(newData);
};

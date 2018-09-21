/**
 * Module for transforming data
 */

/**
 * Transforms the orders from the format in orders.json to the format used in
 * perform_orders
 */
module.exports.extract_orders_and_names = (data) => {
  const new_data = {};

  const usernames = Object.keys(data);
  for (const username of usernames) {
    const restaurant = data[username].restaurant;
    if (!new_data[restaurant]) {
      new_data[restaurant] = {
        restaurant,
        names: [],
        items: [],
      };
    }

    new_data[restaurant].names.push(username);
    new_data[restaurant].items = new_data[restaurant].items.concat(data[username].items);
  }

  return Object.values(new_data);
};

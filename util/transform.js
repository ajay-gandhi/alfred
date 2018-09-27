/**
 * Module for transforming data
 *
 * Orders data is stored persistently in a JSON hash keyed by name, with the
 * value being a hash containing the restaurant and items. This allows for easy
 * overwriting and removing of orders.
 *
 * When inputting the order on Seamless, it's necessary to do so by batching
 * orders by restaurant. This function transforms the hash defined above to an
 * array of objects, containing the restaurant, the names of all those involved
 * in the orders from this restaurant, and a list of all orders.
 *
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

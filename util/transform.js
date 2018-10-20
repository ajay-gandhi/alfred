/**
 * Module for transforming data
 *
 * Orders data is stored persistently in a JSON hash keyed by username, with the
 * value being a hash containing the restaurant and items. This allows for easy
 * overwriting and removing of orders.
 *
 * When inputting the order on Seamless, it's necessary to group orders by
 * restaurant. This function transforms the hash defined above to an array of
 * objects, containing the restaurant and an array of objects containing the
 * username and the items they ordered.
 */
module.exports.indexByRestaurantAndUser = (data) => {
  const newData = {};

  const usernames = Object.keys(data);
  for (const username of usernames) {
    const restaurant = data[username].restaurant;
    if (!newData[restaurant]) {
      newData[restaurant] = {
        restaurant,
        users: [],
      };
    }

    newData[restaurant].users.push({
      username,
      items: data[username].items,
    });
  }

  return Object.values(newData);
};

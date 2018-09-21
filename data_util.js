/**
 * Module for transforming data
 */

/**
 * Transforms the orders from the format in orders.json to the format used in
 * perform_orders
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

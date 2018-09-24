/**
 * Module for interacting with persistent orders data
 */

const fs = require("fs");

const ORDERS_FILE = `${__dirname}/data/orders.json`;
const orders = fs.existsSync(ORDERS_FILE) ? JSON.parse(fs.readFileSync(ORDERS_FILE)) : {};

module.exports.get_orders = () => orders;
module.exports.add_order = (restaurant, username, items) => {
  orders[username] = {
    restaurant,
    items,
  };
  write();
};
module.exports.remove_order = (username) => {
  let removed_order;
  if (orders[username]) {
    removed_order = orders[username];
    delete orders[username];
  }
  write();
  return removed_order;
};
module.exports.clear_orders = () => {
  orders = {};
  write();
};

const write = () => fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders));


/**
 * Module for persistent orders data
 */

const fs = require("fs");

const ORDERS_FILE = `${__dirname}/data/orders.json`;
const orders = fs.existsSync(ORDERS_FILE) ? JSON.parse(fs.readFileSync(ORDERS_FILE)) : {};

module.exports.getOrders = () => orders;
module.exports.addOrder = (restaurant, username, items) => {
  orders[username] = {
    restaurant,
    items,
  };
  write();
};
module.exports.removeOrder = (username) => {
  let removedOrder;
  if (orders[username]) {
    removedOrder = orders[username];
    delete orders[username];
  }
  write();
  return removedOrder;
};
module.exports.clearOrders = () => {
  Object.keys(orders).forEach(k => { delete orders[k]; });
  write();
};

const write = () => fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders));


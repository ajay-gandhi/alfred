
const fs = require("fs");
const { find_restaurant_by_name, find_item_by_name } = require("./data_util");

const all_orders = fs.existsSync("data/orders.json") ? JSON.parse(fs.readFileSync("data/orders.json")) : {};

module.exports.add_order = (rest_input, items, name) => {
  // Convert restaurant to official name
  const restaurant = find_restaurant_by_name(rest_input);
  const rest_name = restaurant.name;

  if (!all_orders[rest_name]) all_orders[rest_name] = {};

  // Add items to order while completing names
  const menu_items = restaurant.menu;
  all_orders[rest_name][name] = items.map(([ item_name, options ]) => {
    const item = find_item_by_name(rest_name, item_name);
    return [item.name, options];
  });
  fs.writeFileSync("data/orders.json", JSON.stringify(all_orders));

  // Compute total value of current order for this restaurant
  const { is_ambiguous, value } = calculate_order_value(rest_name);

  // Return messages based on delivery minimum, etc
  const messages = [`Current order total for ${rest_name}: ${render_dollars(value)}`];
  if (value < restaurant.delivery_min) {
    messages.push(`Current order ${is_ambiguous ? "may" : "does"} not meet delivery minimum (${render_dollars(restaurant.delivery_min)})`);
  }

  return messages;
};

module.exports.remove_order = (name) => {
  const restaurants_with_orders = Object.keys(all_orders);
  let modified_rest;
  for (const rest of restaurants_with_orders) {
    if (all_orders[rest][name]) {
      // RIP immutability
      modified_rest = rest;
      delete all_orders[rest][name];
    }
  }

  if (!modified_rest) {
    return [`${name} does not currently have any orders`];
  }
  if (Object.keys(all_orders[modified_rest]).length === 0) {
    delete all_orders[modified_rest];
    fs.writeFileSync("data/orders.json", JSON.stringify(all_orders));
    return [`No remaining orders for ${modified_rest}`];
  } else {
    fs.writeFileSync("data/orders.json", JSON.stringify(all_orders));
  }

  // Compute total value of current order for this restaurant
  const { is_ambiguous, value } = calculate_order_value(modified_rest);

  // Return messages based on delivery minimum, etc
  const messages = [`Current order total for ${modified_rest}: ${render_dollars(value)}`];
  const restaurant = find_restaurant_by_name(modified_rest);
  if (value < restaurant.delivery_min) {
    messages.push(`Current order ${is_ambiguous ? "may" : "does"} not meet delivery minimum (${render_dollars(restaurant.delivery_min)})`);
  }

  return messages;
};

/**
 * Returns the dollar value of the order for the given restaurant, as well as
 * whether this value is ambiguous. Ambiguity is caused by hard-to-parse prices
 * on Seamless, which result in null price values.
 *
 * Assumes restaurant is proper, i.e. returned from find_restaurant_by_name
 */
const calculate_order_value = (restaurant) => {
  let is_ambiguous = false;
  const current_order_value = Object.values(all_orders[restaurant]).reduce((memo, items) => {
    let current_value = 0;
    for (const item of items) {
      const item_price = find_item_by_name(restaurant, item[0]).price;
      if (!item_price && item_price !== 0) is_ambiguous = true;
      current_value += item_price;
    }
    return memo + current_value;
  }, 0);

  return {
    value: current_order_value,
    is_ambiguous,
  };
};

/**
 * Render a float as a dollar value
 */
const render_dollars = (flt) => {
  if (!flt) return "$0";

  const flt_str = flt.toString();
  const pd_idx = flt_str.indexOf(".");
  if (pd_idx === flt_str.length - 2) {
    return `$${flt_str}0`;
  } else if (pd_idx < flt_str.length - 3 && pd_idx > 0) {
    return `$${flt_str.substring(0, pd_idx + 3)}`;
  } else {
    return `$${flt_str}`;
  }
};

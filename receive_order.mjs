
import fs from "fs";

import {
  find_restaurant_by_name,
  find_item_by_name,
} from "./data_util";

const all_orders = fs.existsSync("orders.json") ? JSON.parse(fs.readFileSync("orders.json")) : {};

export const add_to_order = (rest_input, items, name) => {
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
  fs.writeFileSync("orders.json", JSON.stringify(all_orders));

  // Compute total value of current order for this restaurant
  let is_ambiguous = false;
  const current_order_value = Object.values(all_orders[rest_name]).reduce((memo, items) => {
    let current_value = 0;
    for (let i = 0; i < items.length; i++) {
      const item_price = find_item_by_name(rest_name, items[i][0]).price;
      if (!item_price && item_price !== 0) is_ambiguous = true;
      current_value += item_price;
    }
    return memo + current_value;
  }, 0);

  // Return messages based on delivery minimum, etc
  const messages = [`Current order total for ${rest_name}: $${current_order_value}`];
  if (current_order_value < restaurant.delivery_min) {
    messages.push(`Current order ${is_ambiguous ? "may" : "does"} not meet delivery minimum ($${restaurant.delivery_min})`);
  }

  return messages;
};



const Orders = require("./orders");
const Menu = require("./menu");

module.exports.add_order = (rest_input, items, username) => {
  // Convert restaurant to official name
  const restaurant_data = Menu.find_restaurant_by_name(rest_input);
  const restaurant = restaurant_data.name;

  // Add items to order while completing names
  const corrected_items = items.map(([ item_name, options ]) => {
    const item = Menu.find_item_by_name(restaurant, item_name);
    return [item.name, options];
  });

  Orders.add_order(restaurant, username, items);
};

module.exports.remove_order = Orders.remove_order;

/**
 * Returns the dollar value of the order for the given restaurant, as well as
 * whether this value is ambiguous. Ambiguity is caused by hard-to-parse prices
 * on Seamless, which result in null price values.
 *
 * Assumes restaurant is proper, i.e. returned from find_restaurant_by_name
 */
// const calculate_order_value = (restaurant) => {
  // let is_ambiguous = false;
  // const current_order_value = Object.values(all_orders[restaurant]).reduce((memo, items) => {
    // let current_value = 0;
    // for (const item of items) {
      // const item_price = find_item_by_name(restaurant, item[0]).price;
      // if (!item_price && item_price !== 0) is_ambiguous = true;
      // current_value += item_price;
    // }
    // return memo + current_value;
  // }, 0);

  // return {
    // value: current_order_value,
    // is_ambiguous,
  // };
// };

/**
 * Render a float as a dollar value
 */
// const render_dollars = (flt) => {
  // if (!flt) return "$0";

  // const flt_str = flt.toString();
  // const pd_idx = flt_str.indexOf(".");
  // if (pd_idx === flt_str.length - 2) {
    // return `$${flt_str}0`;
  // } else if (pd_idx < flt_str.length - 3 && pd_idx > 0) {
    // return `$${flt_str.substring(0, pd_idx + 3)}`;
  // } else {
    // return `$${flt_str}`;
  // }
// };

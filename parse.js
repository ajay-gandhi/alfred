
// Constants used in parsing
const CMD_MAP = {
  "order":  "add_order",
  "forget": "remove_order",
};
const CMD_REGEX = / .*/;
const ORDER_REGEX = /order(.*)from/;
const OPTIONS_REGEX = /\[(.*)\]/;

/**
 * Returns an object of this format:
 *
 * {
 *   command: "add_order",
 *   name: "Ajay Gandhi",
 *   params: {
 *     restaurant: "extreme pizza",
 *     items: [[aquafina, []]],
 *   },
 * }
 *
 */
module.exports.parse_command = (name, input) => {
  // Remove alfred
  input = input.substring(input.indexOf(" ") + 1);

  // Parse command
  const command = CMD_MAP[input.replace(CMD_REGEX, "").trim()];
  if (!command) {
    return { errors: ["Command not recognized"] };
  }

  const params = {};
  switch (command) {
    case "add_order": {
      // Parse restaurant
      const from_split = input.split(" from ");
      params.restaurant = from_split.pop().trim();

      const order_str = input.match(ORDER_REGEX)[1];
      const orders = split_outside_parens(order_str);
      params.items = orders.map((order) => {
        const matched_options = order.match(OPTIONS_REGEX);
        if (matched_options) {
          const options = matched_options[1].split(",").map(x => x.trim());
          const item = order.slice(0, order.indexOf("[")).trim();
          return [item, options];
          return matched_options;
        } else {
          // No options
          return [order, []];
        }
      });
      break;
    }
    case "remove_order": {
      break;
    }
  }

  return {
    command,
    name,
    params,
  };
};

// Can do this with regex but don't feel like it
const split_outside_parens = (str) => {
  let inside_parens = false;
  let result = [];
  let start = 0;

  for (let i = 0; i < str.length; i++) {
    if (str.charAt(i) === "[") inside_parens = true;
    if (str.charAt(i) === "]") inside_parens = false;

    if (str.charAt(i) === "," && !inside_parens) {
      result.push(str.slice(start, i).trim());
      start = i + 1;
    }
  }

  if (start !== str.length - 1) result.push(str.slice(start, str.length).trim());

  return result;
};


// Constants used in parsing
const CMD_REGEX = / .*/;
const SPLIT_REGEX = /order (.*) from (.*) at (.*)/;
const NO_TIME_REGEX = /order (.*) from (.*)/;
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
module.exports.parse_command = (input) => {
  // Remove alfred
  input = input.substring(input.indexOf(" ") + 1);

  // Parse command
  const command = input.replace(CMD_REGEX, "").trim();

  const params = {};
  switch (command) {
    case "order": {
      // Parse restaurant
      const parsed = input.match(SPLIT_REGEX) || input.match(NO_TIME_REGEX);
      params.restaurant = parsed[2];
      params.time = parsed[3];

      params.items = split_outside_parens(parsed[1]).map((order) => {
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

    case "info": {
      const [name, phone] = input.substring(input.indexOf(" ") + 1).split(",");
      params.name = name.trim();
      params.phone = phone.trim();
    }

    // Don't have any extra params for this case
    case "forget":
    default:
      break;
  }

  return {
    command,
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


const { parse_command } = require("./parse");
const record_orders = require("./record_orders");
const perform_ordering = require("./perform_ordering");

const input = process.argv.slice(3).join(" ");
const cmd = parse_command(process.argv[2], input);
console.log(record_orders[cmd.command](cmd.params.restaurant, cmd.params.items, cmd.name));

setTimeout(perform_ordering, 3000);

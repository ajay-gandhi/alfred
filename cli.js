
const { parse_command } = require("./parse");
const record_orders = require("./record_orders");
const perform_ordering = require("./perform_ordering");

const Users = require("./users");

const args = process.argv.slice(2);

switch (args.shift()) {
  case "add": {
    const cmd = parse_command(args.shift(), args.join(" "));
    console.log(record_orders[cmd.command](cmd.params.restaurant, cmd.params.items, cmd.name));
    break;
  }

  case "forget": {
    const cmd = parse_command(args.shift(), args.join(" "));
    console.log(record_orders[cmd.command](cmd.name));
    break;
  }

  case "order": {
    // Must explicitly not do dry run
    perform_ordering(args.shift() !== "false");
    break;
  }

  case "user": {
    const [username, name, phone] = args;
    Users.add_user(username, name, phone);
  }

  default: {
    console.log("Command not recognized");
  }
}


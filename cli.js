
const { parse_command } = require("./parse");
const record_orders = require("./record_orders");
const perform_ordering = require("./perform_ordering");

const Users = require("./users");

const args = process.argv.slice(2);

switch (args.shift()) {
  case "add": {
    const username = args.shift();
    const cmd = parse_command(args.join(" "));
    console.log(record_orders.addOrder(cmd.params.restaurant, cmd.params.items, username));
    break;
  }

  case "forget": {
    const cmd = parse_command(args.shift(), args.join(" "));
    console.log(record_orders.removeOrder(cmd.name));
    break;
  }

  case "order": {
    // Must explicitly not do dry run
    perform_ordering(args.shift() !== "false");
    break;
  }

  case "user": {
    const [username, name, phone] = args;
    Users.addUser(username, name, phone);
    break;
  }

  default: {
    console.log("Command not recognized");
  }
}


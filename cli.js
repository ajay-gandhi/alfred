
const { parse_command } = require("./parse");
const record_orders = require("./record_orders");
const perform_ordering = require("./perform_ordering");

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
    const [name, phone] = args;
    const users = fs.existsSync("users.json") ? JSON.parse(fs.readFileSync("users.json")) : {};
    users[name] = { name, phone };
    fs.writeFileSync("users.json", JSON.stringify(users));
  }

  default: {
    console.log("Command not recognized");
  }
}


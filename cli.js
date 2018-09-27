
const Parser = require("./parser");
const Recorder = require("./recorder");
const perform_ordering = require("./perform_ordering");

const Users = require("./users");

const args = process.argv.slice(2);

switch (args.shift()) {
  case "add": {
    const username = args.shift();
    const cmd = Parser.parse(args.join(" "));
    console.log(Recorder.recordOrder(cmd.params.restaurant, cmd.params.items, username));
    break;
  }

  case "forget": {
    const cmd = Parser.parse(args.shift(), args.join(" "));
    console.log(Recorder.forgetOrder(cmd.name));
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


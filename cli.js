/**
 * Command line interface
 *
 * Mocks the server framework and sends input to the Commander module.
 */

const Commander = require("./commander");
const Perform = require("./perform");
const Users = require("./users");
const private = require("./private");

const ctx = {
  request: {
    body: {
      token: private.slackIncomingToken,
    },
  },
};

const args = process.argv.slice(2);

if (args[0] === "perform") {
  // From CLI is always dry run
  const isDryRun = !(args[1] && args[1] === "false");
  Perform.do(isDryRun);
} else {
  // Get user input default "ajay"
  const username = args.reduce((u, a) => a.startsWith("--user=") ? a.substring(7) : u, "ajay");
  ctx.request.body.user_name = username;
  ctx.request.body.user_id = Users.getUser(username).slackId;

  ctx.request.body.text = args.filter(a => !a.startsWith("--user=")).join(" ");

  Commander.do(ctx, () => console.log(ctx.body ? ctx.body.text : "No output"));
}


/**
 * Command line interface
 *
 * Mocks the server framework and sends input to the Commander module.
 */

const Commander = require("./commander");
const Users = require("./models/users");
const priv = require("./private");

const ctx = {
  request: {
    body: {
      token: priv.slackIncomingToken,
    },
  },
};

const args = process.argv.slice(2);

// Get inputted username, default "ajay"
const username = args.reduce((u, a) => a.startsWith("--user=") ? a.substring(7) : u, "ajay");

process.stdout.write("Waiting for init...");
setTimeout(async () => {
  console.log("starting");
  ctx.request.body.user_name = username;
  ctx.request.body.user_id = await Users.getUser(username).slackId;
  ctx.request.body.text = args.filter(a => !a.startsWith("--user=")).join(" ");

  Commander.do(ctx, () => {
    console.log(ctx.body ? ctx.body.text : "No output");
    process.exit(0);
  });
}, 5000);

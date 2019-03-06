/**
 * Command line interface
 *
 * Mocks the server framework and sends input to the Commander module.
 */

const Commander = require("./commander");
const MongoClient = require("mongodb").MongoClient;
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
  const client = new MongoClient(priv.mongoSrv, { useNewUrlParser: true });
  client.connect(async (err) => {
    if (err) console.log("Error connecting to MongoDB:", err);

    // Find user by username
    const user = await client.db(priv.mongoDbName).collection("users").findOne({ username });

    ctx.request.body.user_name = username;
    ctx.request.body.user_id = user.slackId;
    ctx.request.body.text = args.filter(a => !a.startsWith("--user=")).join(" ");

    Commander.do(ctx, () => {
      console.log(ctx.body || "No output");
      process.exit(0);
    });
  });
}, 5000);

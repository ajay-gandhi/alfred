/**
 * Removes every user's favorite
 */

const MongoClient = require("mongodb").MongoClient;
const priv = require("../private");

const client = new MongoClient(priv.mongoSrv, { useNewUrlParser: true });
client.connect((err) => {
  if (err) console.log("Error connecting to MongoDB:", err);
  const password = Math.random().toString(36).slice(4);
  process.stdout.write(`Type "${password}" to continue: `);
  process.stdin.on("data", (data) => {
    const input = data.toString().trim();
    if (input === password) {
      console.log("Confirmation entered correctly, continuing...");
      client
        .db(priv.mongoDbName)
        .collection("users")
        .updateMany({}, {
          $unset: {
            "favorite": "",
          },
        })
        .then(() => {
          console.log(`Removed favorites for all users.`);
          process.exit(0);
        });
    } else {
      console.log("Confirmation entered incorrectly, not executing.");
      process.exit(0);
    }
  });
});


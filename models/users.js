/**
 * Module for interacting with persistent users data
 */

const MongoClient = require("mongodb").MongoClient;
const priv = require("../private");

let users;
const client = new MongoClient(priv.mongoSrv, { useNewUrlParser: true });
client.connect((err) => {
  if (err) console.log("Error connecting to MongoDB:", err);
  users = client.db(priv.mongoDbName).collection("users");
});

module.exports.getUser = async username => await users.findOne({ username });
module.exports.removeUser = async username => await users.deleteOne({ username });
module.exports.addUser = async (username, name, phone, slackId) => {
  return (await users.findOneAndUpdate({ username }, {
    $set: {
      username,
      name,
      phone,
      slackId,
    },
  }, {
    upsert: true,
    returnOriginal: false,
  })).value;
};
module.exports.saveFavorite = async (username, restaurant, items) => {
  await users.findOneAndUpdate({ username }, {
    $set: {
      favorite: {
        restaurant,
        items,
      },
    },
  });
};
module.exports.removeFavorite = async (username) => {
  await users.findOneAndUpdate({ username }, { $unset: { favorite: "" } });
};


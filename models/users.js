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

module.exports.getUser = async slackId => await users.findOne({ slackId });
module.exports.removeUser = async slackId => await users.deleteOne({ slackId });
module.exports.addUser = async (slackId, name, phone, username) => {
  return (await users.findOneAndUpdate({ slackId }, {
    $set: {
      slackId,
      name,
      phone,
      username,
    },
  }, {
    upsert: true,
    returnOriginal: false,
  })).value;
};
module.exports.saveFavorite = async (slackId, restaurant, items) => {
  await users.findOneAndUpdate({ slackId }, {
    $set: {
      favorite: {
        restaurant,
        items,
      },
    },
  });
};
module.exports.removeFavorite = async (slackId) => {
  await users.findOneAndUpdate({ slackId }, { $unset: { favorite: "" } });
};


/**
 * Module for persistent orders data
 */

const MongoClient = require("mongodb").MongoClient;
const logger = require("../logger")("model");
const priv = require("../private");

let orders;
const client = new MongoClient(priv.mongoSrv, { useNewUrlParser: true });
client.connect((err) => {
  if (err) logger.error(err);
  orders = client.db(priv.mongoDbName).collection("orders");
});

module.exports.getOrders = async () => await orders.find({}).toArray();
module.exports.getOrderForUser = async slackId => await orders.findOne({ slackId });
module.exports.addOrder = async (restaurant, slackId, username, items, isDonor) => {
  await orders.findOneAndUpdate({ slackId }, {
    $set: {
      slackId,
      username,
      restaurant,
      items,
      isCallee: false,
      isDonor: isDonor ? true : false,
    },
  }, {
    upsert: true,
  });
};
module.exports.removeOrder = async slackId => (await orders.findOneAndDelete({ slackId })).value;
module.exports.clearOrders = async () => await orders.deleteMany({});
module.exports.setCallee = async (slackId) => {
  await orders.findOneAndUpdate({ slackId }, {
    $set: {
      isCallee: true,
    },
  }, {
    upsert: true,
  });
};

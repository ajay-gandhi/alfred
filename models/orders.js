/**
 * Module for persistent orders data
 */

const MongoClient = require("mongodb").MongoClient;
const priv = require("../private");

let orders;
const client = new MongoClient(priv.mongoSrv, { useNewUrlParser: true });
client.connect((err) => {
  if (err) console.log("Error connecting to MongoDB:", err);
  orders = client.db(priv.mongoDbName).collection("orders");
});

module.exports.getOrders = async () => await orders.find({}).toArray();
module.exports.getOrderForUser = async username => await orders.findOne({ username });
module.exports.addOrder = async (restaurant, username, items) => {
  await orders.findOneAndUpdate({ username }, {
    $set: {
      username,
      restaurant,
      items,
      isCallee: false,
    },
  }, {
    upsert: true,
  });
};
module.exports.removeOrder = async username => (await orders.findOneAndDelete({ username })).value;
module.exports.clearOrders = async () => await orders.deleteMany({});
module.exports.setCallee = async (username) => {
  await orders.findOneAndUpdate({ username }, {
    $set: {
      isCallee: true,
    },
  }, {
    upsert: true,
  });
};


/**
 * Module for interacting with persistent users data
 */

const MongoClient = require("mongodb").MongoClient;
const priv = require("../private");

let menu;
const client = new MongoClient(priv.mongoSrv, { useNewUrlParser: true });
client.connect((err) => {
  if (err) console.log("Error connecting to MongoDB:", err);
  menu = client.db(priv.mongoDbName).collection("menu");
});

module.exports.getAllMenus = async () => await menu.find({}).toArray();
module.exports.getMenu = async name => await menu.findOne({ name });
module.exports.updateMenu = async ({ name, url, items }) => {
  await menu.findOneAndUpdate({ name }, {
    $set: {
      updated: Date.now(),
      name,
      url,
      items,
    },
  }, {
    upsert: true,
  });
};


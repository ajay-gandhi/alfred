/**
 * Module for interacting with persistent users data
 */

const MongoClient = require("mongodb").MongoClient;
const logger = require("../logger")("model");
const priv = require("../private");

let menu;
const client = new MongoClient(priv.mongoSrv, { useNewUrlParser: true });
client.connect((err) => {
  if (err) logger.error(err);
  menu = client.db(priv.mongoDbName).collection("menu");
});

module.exports.getAllMenus = async () => await menu.find({}).toArray();
module.exports.getMenu = async name => await menu.findOne({ name });
module.exports.updateMenu = async ({ name, minimum, url, items }) => {
  await menu.findOneAndUpdate({ name }, {
    $set: {
      updated: Date.now(),
      name,
      minimum,
      url,
      items,
    },
  }, {
    upsert: true,
  });
};


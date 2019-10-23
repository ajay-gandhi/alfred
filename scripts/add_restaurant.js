/**
 * Adds a restaurant to be scraped
 *
 * Basically just adds an empty entry to Mongo so that the next time the scraper
 * runs it'll pick up and scrape.
 */

const MongoClient = require("mongodb").MongoClient;
const priv = require("../private");

const client = new MongoClient(priv.mongoSrv, { useNewUrlParser: true });
client.connect((err) => {
  if (err) console.log("Error connecting to MongoDB:", err);
  client
    .db(priv.mongoDbName)
    .collection("menu")
    .insertOne({ name: process.argv[2] })
    .then(() => {
      console.log(`Added ${process.argv[2]} to scraper.`);
      console.log("Don't forget to generate and upload new entities to Dialogflow!");
      process.exit(0);
    });
});


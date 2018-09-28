/**
 * Generates a random password and puts it in creds
 */
const fs = require("fs");
const creds = require("../creds");
creds.dailyPassword = Math.random().toString(36).slice(-10);
fs.writeFileSync(`${__dirname}/../creds.json`, JSON.stringify(creds, null, 2), "utf8");

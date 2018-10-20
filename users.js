/**
 * Module for interacting with persistent users data
 */

const fs = require("fs");

const USERS_FILE = `${__dirname}/data/users.json`;
const users = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE)) : {};

module.exports.getAllUsers = () => users;
module.exports.getUser = username => users[username] || {};
module.exports.addUser = (username, name, phone, slackId) => {
  users[username] = {
    username,
    name,
    phone,
    slackId,
  };
  write();
};

const write = () => fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));


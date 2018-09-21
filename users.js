/**
 * Module for interacting with persistent users data
 */

const fs = require("fs");

const USERS_FILE = `${__dirname}/data/users.json`;
const users = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE)) : {};

module.exports.get_all_users = () => users;
module.exports.get_user = username => users[username];
module.exports.add_user = (username, name, phone) => {
  users[username] = {
    username,
    name,
    phone,
  };
  write();
};

const write = () => fs.writeFileSync(USERS_FILE, JSON.stringify(users));


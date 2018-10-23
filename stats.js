/**
 * Module for interacting with persistent stats data
 */

const fs = require("fs");

const STATS_FILE = `${__dirname}/data/stats.json`;
const stats = fs.existsSync(STATS_FILE) ? JSON.parse(fs.readFileSync(STATS_FILE)) : {};

const N_TOP_DISHES = 3;

module.exports.getAllStats = () => stats;

/********************************** Helpers ***********************************/

/**
 * Return how many times the given user has been called
 */
const getCallsForUser = u => stats[u] && stats[u].calls || 0;

/**
 * Return the dollar value that the user spent at this restaurant
 */
const getDollarsForRestaurant = (u, r) => stats[u] && stats[u][r] && stats[u][r] && stats[u][r].dollars || 0;

/**
 * Return the dollar value that the user spent
 */
const getDollarsForUser = u => Object.keys(stats[u]).reduce((m, r) => m + getDollarsForRestaurant(u, r), 0);

/**
 * Return the dollar value that all users spent
 */
const getTotalDollars = () => Object.keys(stats).reduce((m, u) => m + getDollarsForUser(u), 0);

/**
 * Return the top dishes for this user at this restaurant
 */
const getTopDishesForRestaurant = (user, restaurant, givenTops) => {
  if (!stats[user] || !stats[user][restaurant]) return [];

  const tops = givenTops || [];

  Object.keys(stats[user][restaurant].items).forEach((itemName) => {
    for (let i = 0; i < N_TOP_DISHES; i++) {
      if (!tops[i] || stats[user][restaurant].items[itemName] > tops[i].count) {
        tops.splice(i, 0, {
          restaurant,
          itemName,
          count: stats[user][restaurant].items[itemName],
        });
        if (givenTops) tops[i].restaurant = restaurant;
        if (tops.length > N_TOP_DISHES) tops.pop();
        break;
      }
    }
  });
  return tops.filter(t => t.count > 0);
};

/**
 * Return the top dishes for this user
 */
const getTopDishesForUser = (user) => {
  if (!stats[user]) return [];

  return Object.keys(stats[user]).reduce((memo, restaurant) => {
    return getTopDishesForRestaurant(user, restaurant, memo);
  }, []).filter(t => t.count > 0);
};

/**
 * Return the top dishes for all users
 */
const getTopDishes = () => {
  // Consolidate data (remove user abstraction)
  const consolidated = {};
  Object.keys(stats).forEach((user) => {
    Object.keys(stats[user]).forEach((restaurant) => {
      if (!consolidated[restaurant]) consolidated[restaurant] = {};
      Object.keys(stats[user][restaurant].items).forEach((itemName) => {
        if (consolidated[restaurant][itemName]) {
          consolidated[restaurant][itemName] += stats[user][restaurant].items[itemName];
        } else {
          consolidated[restaurant][itemName] = stats[user][restaurant].items[itemName];
        }
      });
    });
  });

  const tops = [];
  for (let i = 0; i < N_TOP_DISHES; i++) { tops.push({ count: 0 }); }

  Object.keys(consolidated).forEach((restaurant) => {
    Object.keys(consolidated[restaurant]).forEach((itemName) => {
      for (let i = 0; i < N_TOP_DISHES; i++) {
        if (stats[user][restaurant].items[itemName] > tops[i].count) {
          tops.splice(i, 0, {
            restaurant,
            itemName,
            count: stats[user][restaurant].items[itemName],
          });
          tops.pop();
        }
      }
    });
  });

  return tops.filter(t => !!t.restaurant);
};

/********************************** Exports ***********************************/

// The following functions consolidate data from above helpers
const getStatsForUserFromRestaurant = (user, restaurant) => ({
  dollars: getDollarsForRestaurant(user, restaurant),
  dishes: getTopDishesForRestaurant(user, restaurant),
});
const getStatsForUser = (user) => ({
  calls: getCallsForUser(user),
  dollars: getDollarsForUser(user),
  dishes: getTopDishesForUser(user),
});
const getGlobalStats = () => ({
  dollars: getTotalDollars(),
  dishes: getTopDishes(),
});

/**
 * Record that the given user ordered the given dollar amount from the given
 * restaurant
 */
const recordDollars = (user, restaurant, dollars) => {
  if (!stats[user])                     stats[user] = {};
  if (!stats[user][restaurant])         stats[user][restaurant] = {};
  if (!stats[user][restaurant].dollars) stats[user][restaurant].dollars = 0;
  stats[user][restaurant].dollars += dollars;
};

/**
 * Record that the given user ordered the given item from the given restaurant
 */
const recordDish = (user, restaurant, itemName) => {
  if (!stats[user])                             stats[user] = {};
  if (!stats[user][restaurant])                 stats[user][restaurant] = {};
  if (!stats[user][restaurant].items)           stats[user][restaurant].items = {};
  if (!stats[user][restaurant].items[itemName]) stats[user][restaurant].items[itemName] = 0;
  stats[user][restaurant].items[itemName]++;
};

/**
 * Record that the given user was selected for a call
 */
const recordCall = (user) => {
  if (!stats[user]) stats[user] = {};
  stats[user].calls = stats[user].calls ? stats[user].calls + 1 : 1;
};

/**
 * Save the new data to disk
 */
const save = () => fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));

module.exports = {
  getStatsForUserFromRestaurant,
  getStatsForUser,
  getGlobalStats,
  recordDollars,
  recordDish,
  recordCall,
  save,
};

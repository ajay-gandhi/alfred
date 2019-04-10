// Generate restaurant entities
const Menu = require("../models/menu");

setTimeout(async () => {
  const menus = (await Menu.getAllMenus()).map(({ name }) => {
    const poss = fullSet(perms(name.replace(/[()]/gi, "").split(" ")));
    return [`"${name}"`].concat(poss.map(p => `"${p}"`)).join(",");
  });
  console.log(menus.join("\n"));
  process.exit(0);
}, 5000);

// Return all possible reasonable permutations
const perms = (arr) => {
  if (arr.length === 1) return [arr[0]];

  const sub = perms(arr.slice(1));
  return sub.map(s => `${arr[0]} ${s}`).concat(sub).concat(arr[0]);
};

// Return all possible formats
const fullSet = (arr) => {
  return arr
    .concat(arr.map(s => s.replace("&", "and")))
    .concat(arr.map(s => s.replace(/[^a-z ]/gi, "")))
    .filter((value, idx, self) => self.indexOf(value) === idx);
};

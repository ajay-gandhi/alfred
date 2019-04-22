
const Menu = require("../models/menu");

setTimeout(async () => {
  const menus = await Menu.getAllMenus();
  const reqdOpts = menus.reduce((memo1, menu) => {
    return menu.items.reduce((memo2, item) => {
      return item.optionSets.reduce((memo3, optionSet) => {
        if (optionSet.radio) {
          return memo3.concat({
            restaurant: menu.name,
            item: item.name,
            ...optionSet,
          });
        } else {
          return memo3;
        }
      }, memo2);
    }, memo1);
  }, []);
  console.log(reqdOpts);
}, 5000);

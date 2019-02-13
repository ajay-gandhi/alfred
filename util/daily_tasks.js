const fs = require("fs");
const Orders = require("../orders");
const priv = require("../private");

(async () => {
  // Generate a random password and put it in private
  priv.dailyPassword = Math.random().toString(36).slice(-10);
  fs.writeFileSync(`${__dirname}/../private.json`, JSON.stringify(priv, null, 2), "utf8");

  // Remove all confirmation PDFs
  const dir = `${__dirname}/../confirmations/`;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    if (file.split(".").pop() === "pdf") fs.unlinkSync(`${dir}${file}`);
  }

  // Clear orders every night
  setTimeout(async () => {
    await Orders.clearOrders();
    process.exit(0);
  }, 5000);
})();

const fs = require("fs");
const Orders = require("../orders");
const private = require("../private");

(async () => {
  // Clear orders every night
  await Orders.clearOrders();

  // Generate a random password and put it in private
  private.dailyPassword = Math.random().toString(36).slice(-10);
  fs.writeFileSync(`${__dirname}/../private.json`, JSON.stringify(private, null, 2), "utf8");

  // Remove all confirmation PDFs
  const dir = `${__dirname}/../confirmations/`;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    if (file.split(".").pop() === "pdf") fs.unlinkSync(`${dir}${file}`);
  }
})();

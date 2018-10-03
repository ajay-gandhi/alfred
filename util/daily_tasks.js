// Generate a random password and put it in creds
const fs = require("fs");
const creds = require("../creds");
creds.dailyPassword = Math.random().toString(36).slice(-10);
fs.writeFileSync(`${__dirname}/../creds.json`, JSON.stringify(creds, null, 2), "utf8");

// Remove all confirmation PDFs
const dir = `${__dirname}/../confirmations/`;
fs.readdir(dir, (err, files) => {
  if (err) throw err;

  for (const file of files) {
    if (file.split(".").pop() === "pdf") {
      fs.unlink(`${dir}${file}`, (err) => {
        if (err) throw err;
      });
    }
  }
});

/**
 * Module for sending messages to Slack
 */

const request = require("request");
const Users = require("../users");
const private = require("../private");

module.exports.sendBasicMessage = (message) => {
  sendMessage({ text: message });
};

const atUser = async (username) => {
  const u = await Users.getUser(username);
  return u.slackId ? `<@${u.slackId}>` : `@${username}`;
}
module.exports.atUser = atUser;

// Formats the given stats
module.exports.statsFormatter = (stats) => {
  const dollarStats = `Total spent: $${stats.dollars.toFixed(2)}\n\n`;

  let callStats = "";
  if (stats.calls) {
    callStats = `Total calls received: ${stats.calls}\n\n`;
  }

  let dishStatsPrefix = "Top dishes:\n";
  let dishStats = "  None";
  if (stats.dishes.length > 0) {
    formattedDishes= stats.dishes.map((d) => {
      const rest = d.restaurant ? ` from ${d.restaurant}` : "";
      return `  ${d.count} of "${d.itemName}"${rest}`;
    });
    dishStats = formattedDishes.join("\n");
  }
  const otherMessage = Math.random() > 0.8 ? "\n\nWant other stats? Message Ajay!" : "";
  return `\`\`\`${dollarStats}${callStats}${dishStatsPrefix}${dishStats}${otherMessage}\`\`\``;
};

/**
 * Format of parts:
 *
 * [
 *   {
 *     successful: bool,
 *     restaurant: string,
 *     user: string,
 *     confirmationUrl: string,
 *   },
 *   ...
 * ],
 */
const ordered = "Alfred ordered from the following restaurants for delivery at 5:30pm.";
const willOrder = "Alfred will make these orders at 3:30pm:";
module.exports.sendFinishedMessage = async (parts, dry) => {
  const attachments = await Promise.all(parts.map(async (part) => {
    const attachment = {
      color: part.successful ? "good" : "danger",
    };

    if (part.successful) {
      const slackAt = await atUser(part.userCall);
      attachment.title = part.restaurant;
      attachment.title_link = part.confirmationUrl;
      if (!dry) attachment.text = `${slackAt} will receive the call.`;
    } else {
      attachment.title = `${part.restaurant} (${dry ? "no order" : "failed"})`;
      attachment.text = part.errors.join("\n");
      attachment.text += `\nFYI: ${part.users.map(u => atUser(u.username)).join(", ")}`;
    }
    return attachment;
  }));

  const { dailyPassword } = require("../private");

  await sendMessage({
    text: [
      dry ? willOrder : ordered,
      `Today's password is \`${dailyPassword}\`.`,
    ].join("\n"),
    attachments,
  });
};


const sendMessage = (contents) => {
  contents.channel = "#ot-test-ram";
  return new Promise((resolve, reject) => {
    request({
      url: private.slackOutgoingUrl,
      method: "POST",
      json: contents,
    }, (err, response, body) => {
      if (response.statusCode !== 200) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

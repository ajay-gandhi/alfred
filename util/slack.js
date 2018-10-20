/**
 * Module for sending messages to Slack
 */

const request = require("request");
const Users = require("../users");
const private = require("../private");

module.exports.sendBasicMessage = (message) => {
  sendMessage({ text: message });
};

const atUser = username => `<@${Users.getUser(username).slackId}>`;
module.exports.atUser = atUser;

// Formats the given stats
module.exports.statsFormatter = (dollars, dishes) => {
  return `\`\`\`Total spent: $${dollars}\n\nTop dishes:\n${dishes.map(d => `  ${d}`).join("\n")}`;
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
module.exports.sendFinishedMessage = (parts) => {
  const attachments = parts.map((part) => {
    const attachment = {
      color: part.successful ? "good" : "danger",
    };

    if (part.successful) {
      attachment.title = part.restaurant;
      attachment.title_link = part.confirmationUrl;
      attachment.text = `${atUser(parts.user)} will receive the call.`;
    } else {
      attachment.title = `${part.restaurant} (failed)`;
      attachment.text = part.errors.join("\n");
    }
    return attachment;
  });

  const { dailyPassword } = require("../private");

  sendMessage({
    text: [
      "Alfred ordered from the following restaurants for delivery at 5:30pm.",
      `Today's password is \`${dailyPassword}\`.`,
    ].join("\n"),
    attachments,
  });
};


const sendMessage = (contents) => {
  contents.channel = "#ot-test-ram",
  request({
    url: private.slackOutgoingUrl,
    method: "POST",
    json: contents,
  },
  (err, response, body) => {
    if (response.statusCode !== 200) {
      console.log("Message send failed");
      console.log(err, body);
    }
  });
};

/**
 * Module for sending messages to Slack
 */

const request = require("request");
const creds = require("../creds");

module.exports.sendBasicMessage = (message) => {
  sendMessage({ text: message });
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
      attachment.text = `${part.user} will receive the call.`;
    } else {
      attachment.title = `${part.restaurant} (failed)`;
      attachment.text = part.errors.join("\n");
    }
    return attachment;
  });

  const { dailyPassword } = require("../creds");

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
    url: creds.slackOutgoingUrl,
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

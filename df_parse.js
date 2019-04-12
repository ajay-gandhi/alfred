/**
 * Module for interacting with Dialogflow
 */

const dialogflow = require("dialogflow");
const logger = require("./logger")("df-parse");

const PROJECT_ID = "alfred-273e2";
const SESSION_ID = "main-session-id";
const LANG = "en-US";

const sessionClient = new dialogflow.SessionsClient();
const SESSION_PATH = sessionClient.sessionPath(PROJECT_ID, SESSION_ID);

/**
 * Given the input text, resolves the promise with the NLP-parsed command
 * and arguments
 */
module.exports = (text) => {
  const input = text.replace(/^(alfred |alfie )/, "");
  const request = {
    session: SESSION_PATH,
    queryParams: {
      resetContexts: true,
    },
    queryInput: {
      text: {
        text: input,
        languageCode: LANG,
      },
    },
  };

  return new Promise((resolve, reject) => {
    sessionClient
      .detectIntent(request)
      .then((responses) => {
        const result = responses[0].queryResult;
        if (result.action === "input.unknown") return resolve(false);

        if (result.action.startsWith("smalltalk")) {
          resolve({
            command: "Small Talk",
            args: {
              text: result.fulfillmentText,
            },
          });
        } else {
          const args = {};
          Object.keys(result.parameters.fields).forEach((key) => {
            args[key] = result.parameters.fields[key].stringValue;
          });
          resolve({
            command: result.intent.displayName,
            args,
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        reject({ command: false });
      });
  });
};


const fastify = require("fastify")({ logger: true });

const { parse_command } = require("./parse");
const RecordOrders = require("./record_orders");
const Users = require("./users");
const { slackIncomingToken } = require("./creds");

const PORT = process.argv[2] || 9002;

fastify.register(require("fastify-formbody"));
fastify.register(require("fastify-static"), {
  root: `${__dirname}/confirmations`,
  prefix: "/confirmations/",
});

fastify.route({
  method: "POST",
  url: "/command",
  handler: async (req, res) => {
    if (req.body.token !== slackIncomingToken) {
      console.log("Request does not have proper secret");
      return {};
    }
    if (!req.body.text || !req.body.user_name) {
      console.log("Request is missing username or text");
      return {};
    }

    const username = req.body.user_name;
    const parsed = parse_command(req.body.text);

    switch (parsed.command) {
      case "order":
        RecordOrders.add_order(parsed.params.restaurant, parsed.params.items, username);
        break;

      case "forget":
        RecordOrders.remove_order(username);
        break;

      case "info":
        Users.add_user(username, parsed.params.name, parsed.params.phone);
        break;

      default:
        return {};
    }

    return { hello: "world" };
  },
});

(async () => {
  try {
    await fastify.listen(PORT);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
})();

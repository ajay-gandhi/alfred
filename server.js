
const fastify = require("fastify")({ logger: true });

const RecordOrders = require("./record_orders");
const Users = require("./users");
const { slackIncomingToken } = require("./creds");

const PORT = process.argv[2] || 9002;

fastify.route({
  method: "POST",
  url: "/command",
  schema: {
    body: {
      type: "object",
      properties: {
        text: { type: "string" },
        user_name: { type: "string" },
        token: { type: "string" },
      },
    },
  },
  handler: async (req, res) => {
    if (req.body.token !== slackIncomingToken) {
      console.log("Request does not have proper secret");
      return {};
    }

    const username = req.body.user_name;
    const parsed = parse_command(req.body.text);

    switch (parsed.command) {
      case "order":
        RecordOrders.add_order(parsed.restaurant, parsed.items, username);
        break;

      case "forget":
        RecordOrders.remove_order(username);
        break;

      case "info":
        Users.add_user(username, parsed.name, parsed.phone);
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
    fastify.log.info(`server listening on ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
})();

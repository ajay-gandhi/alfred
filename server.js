
const fastify = require("fastify")({ logger: true });

const RecordOrders = require("./record_orders");
const Users = require("./users");

fastify.route({
  method: "POST",
  url: "/",
  schema: {
    body: {
      type: "object",
      properties: {
        text: { type: "string" },
        user_name: { type: "number" },
      },
    },
  },
  handler: async (req, res) => {
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
    }

    return { hello: "world" };
  },
});

(async () => {
  try {
    await fastify.listen(9002);
    fastify.log.info(`server listening on ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
})();

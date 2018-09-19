// Tests for parse.js

const { parse_command } = require("../parse");

// Try adding orders
const test_name = "Ajay Gandhi";
const test_inputs = [
  "alfred order chicken momo from newa",
  "alfred order chicken momo, chicken momo [large] from newa",
  "alfred order aquafina, cheese pizza (indee) [green peppers, chicken] from extreme pizza",
  "alfred forget",
];

const test_outputs = [
  {
    command: "add_order",
    name: test_name,
    params: {
      restaurant: "newa",
      items: [
        ["chicken momo", []],
      ],
    },
  },
  {
    command: "add_order",
    name: test_name,
    params: {
      restaurant: "newa",
      items: [
        ["chicken momo", []],
        ["chicken momo", ["large"]],
      ],
    },
  },
  {
    command: "add_order",
    name: test_name,
    params: {
      restaurant: "extreme pizza",
      items: [
        ["aquafina", []],
        ["cheese pizza (indee)", ["green peppers", "chicken"]],
      ],
    },
  },
  {
    command: "remove_order",
    name: test_name,
    params: {},
  },
];

test("parses basic add order", () => {
  expect(parse_command(test_name, test_inputs[0])).toEqual(test_outputs[0]);
});

test("parses add order with one option", () => {
  expect(parse_command(test_name, test_inputs[1])).toEqual(test_outputs[1]);
});

test("parses add order with multiple options", () => {
  expect(parse_command(test_name, test_inputs[2])).toEqual(test_outputs[2]);
});

test("parses remove order", () => {
  expect(parse_command(test_name, test_inputs[3])).toEqual(test_outputs[3]);
});


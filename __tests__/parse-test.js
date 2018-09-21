// Tests for parse.js

const { parse_command } = require("../parse");

// Try adding orders
const test_inputs = [
  "alfred order chicken momo from newa",
  "alfred order chicken momo, chicken momo [large] from newa",
  "alfred order aquafina, cheese pizza (indee) [green peppers, chicken] from extreme pizza",
  "alfred order chicken momo from newa at 5pm",
  "alfred forget",
  "alfred info ajay gandhi, 1234567890",
];

const test_outputs = [
  {
    command: "order",
    params: {
      restaurant: "newa",
      items: [
        ["chicken momo", []],
      ],
    },
  },
  {
    command: "order",
    params: {
      restaurant: "newa",
      items: [
        ["chicken momo", []],
        ["chicken momo", ["large"]],
      ],
    },
  },
  {
    command: "order",
    params: {
      restaurant: "extreme pizza",
      items: [
        ["aquafina", []],
        ["cheese pizza (indee)", ["green peppers", "chicken"]],
      ],
    },
  },
  {
    command: "order",
    params: {
      time: "5pm",
      restaurant: "newa",
      items: [
        ["chicken momo", []],
      ],
    },
  },
  {
    command: "forget",
    params: {},
  },
  {
    command: "info",
    params: {
      name: "ajay gandhi",
      phone: "1234567890",
    },
  },
];

test("parses basic add order", () => {
  expect(parse_command(test_inputs[0])).toEqual(test_outputs[0]);
});

test("parses add order with one option", () => {
  expect(parse_command(test_inputs[1])).toEqual(test_outputs[1]);
});

test("parses add order with multiple options", () => {
  expect(parse_command(test_inputs[2])).toEqual(test_outputs[2]);
});

test("parses add order with a time", () => {
  expect(parse_command(test_inputs[3])).toEqual(test_outputs[3]);
});

test("parses remove order", () => {
  expect(parse_command(test_inputs[4])).toEqual(test_outputs[4]);
});

test("parses adding user", () => {
  expect(parse_command(test_inputs[5])).toEqual(test_outputs[5]);
});


// Tests for parser.js
const Parser = require("../parser");

const testInputs = [
  "alfred order chicken momo from newa",
  "alfred order chicken momo, chicken momo [large] from newa",
  "alfred order aquafina, cheese pizza (indee) [green peppers, chicken] from extreme pizza",
  "alfred order chicken momo from newa at 5pm",
  "alfred forget",
  "alfred info ajay gandhi, 1234567890",
];

const testOutputs = [
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
  expect(Parser.parse(testInputs[0])).toEqual(testOutputs[0]);
});

test("parses add order with one option", () => {
  expect(Parser.parse(testInputs[1])).toEqual(testOutputs[1]);
});

test("parses add order with multiple options", () => {
  expect(Parser.parse(testInputs[2])).toEqual(testOutputs[2]);
});

test("parses add order with a time", () => {
  expect(Parser.parse(testInputs[3])).toEqual(testOutputs[3]);
});

test("parses remove order", () => {
  expect(Parser.parse(testInputs[4])).toEqual(testOutputs[4]);
});

test("parses adding user", () => {
  expect(Parser.parse(testInputs[5])).toEqual(testOutputs[5]);
});


// Tests for recorder.js
const Recorder = require("../recorder");
const Orders = require("../orders");

const testInputs = [
  {
    // Addition
    restaurant: "bamboo",
    order: [["tempura combo", []], ["soda", ["sprite"]]],
    name: "Ajay Gandhi",
  },
  {
    // Addition
    restaurant: "bamboo",
    order: [["shioyaki", []]],
    name: "Bionic Barry",
  },
  {
    // Removal
    name: "Ajay Gandhi",
  },
  {
    // Removal
    name: "Bionic Barry",
  },
];

const testOutputs = [
  {
    "Ajay Gandhi": {"items": [["Tempura Combo", []], ["Can Soda", ["sprite"]]], "restaurant": "Bamboo"},
  },
  {
    "Ajay Gandhi": {"items": [["Tempura Combo", []], ["Can Soda", ["sprite"]]], "restaurant": "Bamboo"},
    "Bionic Barry": {"items": [["Shioyaki a la Carte", []]], "restaurant": "Bamboo"},
  },
  {
    "Bionic Barry": {"items": [["Shioyaki a la Carte", []]], "restaurant": "Bamboo"},
  },
  {},
];

test("adds to new restaurant", () => {
  Recorder.recordOrder(testInputs[0].restaurant, testInputs[0].order, testInputs[0].name);
  expect(Orders.getOrders()).toEqual(testOutputs[0]);
});

test("adds to existing restaurant", () => {
  Recorder.recordOrder(testInputs[1].restaurant, testInputs[1].order, testInputs[1].name);
  expect(Orders.getOrders()).toEqual(testOutputs[1]);
});

test("remove order", () => {
  Recorder.forgetOrder(testInputs[2].name);
  expect(Orders.getOrders()).toEqual(testOutputs[2]);
});

test("remove last order", () => {
  Recorder.forgetOrder(testInputs[3].name);
  expect(Orders.getOrders()).toEqual(testOutputs[3]);
});


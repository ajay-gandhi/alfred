// Tests for record_orders.js

const { addOrder, removeOrder } = require("../record_orders");
const Orders = require("../orders");

// Try adding orders
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
  addOrder(testInputs[0].restaurant, testInputs[0].order, testInputs[0].name);
  expect(Orders.getOrders()).toEqual(testOutputs[0]);
});

test("adds to existing restaurant", () => {
  addOrder(testInputs[1].restaurant, testInputs[1].order, testInputs[1].name);
  expect(Orders.getOrders()).toEqual(testOutputs[1]);
});

test("remove order", () => {
  removeOrder(testInputs[2].name);
  expect(Orders.getOrders()).toEqual(testOutputs[2]);
});

test("remove last order", () => {
  removeOrder(testInputs[3].name);
  expect(Orders.getOrders()).toEqual(testOutputs[3]);
});


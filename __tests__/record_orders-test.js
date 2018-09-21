// Tests for record_orders.js

const { add_order, remove_order } = require("../record_orders");
const Orders = require("../orders");

// Try adding orders
const test_inputs = [
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

const test_outputs = [
  {
    "Ajay Gandhi": {"items": [["tempura combo", []], ["soda", ["sprite"]]], "restaurant": "Bamboo"},
  },
  {
    "Ajay Gandhi": {"items": [["tempura combo", []], ["soda", ["sprite"]]], "restaurant": "Bamboo"},
    "Bionic Barry": {"items": [["shioyaki", []]], "restaurant": "Bamboo"},
  },
  {
    "Bionic Barry": {"items": [["shioyaki", []]], "restaurant": "Bamboo"},
  },
  {},
];

test("adds to new restaurant", () => {
  add_order(test_inputs[0].restaurant, test_inputs[0].order, test_inputs[0].name);
  expect(Orders.get_orders()).toEqual(test_outputs[0]);
});

test("adds to existing restaurant", () => {
  add_order(test_inputs[1].restaurant, test_inputs[1].order, test_inputs[1].name);
  expect(Orders.get_orders()).toEqual(test_outputs[1]);
});

test("remove order", () => {
  remove_order(test_inputs[2].name);
  expect(Orders.get_orders()).toEqual(test_outputs[2]);
});

test("remove last order", () => {
  remove_order(test_inputs[3].name);
  expect(Orders.get_orders()).toEqual(test_outputs[3]);
});


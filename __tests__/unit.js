// Tests for record_orders.js

const { add_order, remove_order } = require("../record_orders");

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
  [
    "Current order total for Bamboo: $7.95",
    "Current order may not meet delivery minimum ($17)"
  ],
  [
    "Current order total for Bamboo: $24.90",
  ],
  [
    "Current order total for Bamboo: $16.95",
    "Current order does not meet delivery minimum ($17)"
  ],
  [
    "No remaining orders for Bamboo",
  ],
];

test("adds to new restaurant", () => {
  expect(add_order(test_inputs[0].restaurant, test_inputs[0].order, test_inputs[0].name)).toEqual(test_outputs[0]);
});

test("adds to existing restaurant", () => {
  expect(add_order(test_inputs[1].restaurant, test_inputs[1].order, test_inputs[1].name)).toEqual(test_outputs[1]);
});

test("remove order", () => {
  expect(remove_order(test_inputs[2].name)).toEqual(test_outputs[2]);
});

test("remove last order", () => {
  expect(remove_order(test_inputs[3].name)).toEqual(test_outputs[3]);
});


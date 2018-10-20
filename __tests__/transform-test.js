// Tests for parser.js

const Transform = require("../util/transform");

// Try adding orders
const testInputs = [
  {},
  {
    "alice": {
      "restaurant": "american",
      "items": [["hot dog", []], ["burger", ["lettuce"]]],
    },
    "bob": {
      "restaurant": "italian",
      "items": [["pizza", ["onions"]], ["pasta", []]],
    },
    "cad": {
      "restaurant": "italian",
      "items": [["pizza", ["chicken"]]],
    },
  }
];

const testOutputs = [
  [],
  [
    {
      "restaurant": "american",
      "users": [
        {
          "username": "alice",
          "items": [["hot dog", []], ["burger", ["lettuce"]]],
        },
      ],
    },
    {
      "restaurant": "italian",
      "users": [
        {
          "username": "bob",
          "items": [["pizza", ["onions"]], ["pasta", []]],
        },
        {
          "username": "cad",
          "items": [["pizza", ["chicken"]]],
        },
      ],
    },
  ],
];

test("transforms empty data", () => {
  expect(Transform.indexByRestaurantAndUser(testInputs[0])).toEqual(testOutputs[0]);
});

test("transforms several data", () => {
  expect(Transform.indexByRestaurantAndUser(testInputs[1])).toEqual(testOutputs[1]);
});


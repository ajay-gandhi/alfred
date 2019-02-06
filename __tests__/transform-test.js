// Tests for util/transform.js

const Transform = require("../util/transform");

describe("indexByRestaurantAndUser", () => {
  // Try adding orders
  const testInputs = [
    [],
    [{
      "username": "alice",
      "restaurant": "american",
      "items": [["hot dog", []], ["burger", ["lettuce"]]],
    }, {
      "username": "bob",
      "restaurant": "italian",
      "items": [["pizza", ["onions"]], ["pasta", []]],
    }, {
      "username": "cad",
      "restaurant": "italian",
      "items": [["pizza", ["chicken"]]],
    }]
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
});

describe("correctRestaurant", () => {
  test("corrects a valid restaurant", () => {
    expect(Transform.correctRestaurant("newa").name).toEqual("Newa (Ellis St)");
  });

  test("returns false for an invalid restaurant", () => {
    const invalidRest = "nwea";
    expect(Transform.correctRestaurant(invalidRest).error).toEqual(`Couldn't find restaurant called "${invalidRest}".`);
  });
});

describe("parseOrders", () => {
  test("basic order parse", () => {
    expect(Transform.parseOrders("chicken momo and lassi", "Newa (Ellis St)")).toEqual({
      "correctedItems": [
        ["Chicken Momo", []],
        ["Mango Lassi", []],
      ],
    });
  });

  test("order with options", () => {
    expect(Transform.parseOrders("chicken momo (large)", "Newa (Ellis St)")).toEqual({
      "correctedItems": [
        ["Chicken Momo", ["large"]],
      ],
    });
  });

  test("multiple items with options", () => {
    expect(Transform.parseOrders("cheese pizza indee (mushrooms, chicken), boneless wings (5 lb)", "Extreme Pizza (Folsom)")).toEqual({
      "correctedItems": [
        ["Classic Cheese Pizza (Indee)", ["mushrooms", "chicken"]],
        ["Boneless Wings", ["5 lb"]],
      ],
    });
  });

  test("item not found", () => {
    expect(Transform.parseOrders("chicken choila", "Extreme Pizza (Folsom)")).toEqual({
      "error": "Couldn't find item called \"chicken choila\".",
    });
  });
});

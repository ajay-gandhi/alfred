// Tests for util/transform.js

const Transform = require("../util/transform");

jest.setTimeout(10000);

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
  test("corrects a valid restaurant", (done) => {
    setTimeout(async () => {
      expect((await Transform.correctRestaurant("newa")).name).toEqual("Newa (Ellis St)");
      done();
    }, 5000);
  });

  test("returns false for an invalid restaurant", (done) => {
    setTimeout(async () => {
      const invalidRest = "nwea";
      expect((await Transform.correctRestaurant(invalidRest)).error).toEqual(`Couldn't find restaurant called "${invalidRest}".`);
      done();
    }, 5000);
  });
});

describe("parseOrders", () => {
  test("basic order parse", (done) => {
    setTimeout(async () => {
      expect(await Transform.parseOrders("chicken momo and lassi", "Newa (Ellis St)")).toEqual({
        "correctedItems": [
          ["Chicken Momo Jhol", []],
          ["Mango Lassi", []],
        ],
      });
      done();
    }, 5000);
  });

  test("order with options", (done) => {
    setTimeout(async () => {
      expect(await Transform.parseOrders("chicken momo (large)", "Newa (Ellis St)")).toEqual({
        "correctedItems": [
          ["Chicken Momo Jhol", ["large"]],
        ],
      });
      done();
    }, 5000);
  });

  test("multiple items with options", (done) => {
    setTimeout(async () => {
      expect(await Transform.parseOrders("cheese pizza indee (mushrooms, chicken), boneless wings (5 lb)", "Extreme Pizza (Folsom)")).toEqual({
        "correctedItems": [
          ["Classic Cheese Pizza (Indee)", ["mushrooms", "chicken"]],
          ["Boneless Wings", ["5 lb"]],
        ],
      });
      done();
    }, 5000);
  });

  test("item not found", (done) => {
    setTimeout(async () => {
      expect(await Transform.parseOrders("chicken choila", "Extreme Pizza (Folsom)")).toEqual({
        "error": "Couldn't find item called \"chicken choila\". Did you mean \"Chicken Pesto Sub\"?",
      });
      done();
    }, 5000);
  });
});

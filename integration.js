
const record_order = require("./record_orders");
const perform_order = require("./perform_ordering");

console.log(record_order.add_order("bamboo", [["shioyaki", []]], "Johan Augustine"));
console.log(record_order.add_order("bamboo", [["soda", ["sprite"]], ["tempura combo", []]], "James Wei"));

console.log(record_order.add_order("extreme pizza", [["cheese pizza (medium)", []]], "Jay Jung"));

setTimeout(perform_order, 3000);

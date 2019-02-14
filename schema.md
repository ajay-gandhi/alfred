# Data schema

menu: Scraped menu for every restaurant on Seamless. Some price values may
be `false`; this is because some prices depend on the selected options (and thus
aren't parsed).
```
{
  "name": "$restaurantName",
  "deliveryMin": "$deliveryMin",
  "menu": [
    {
      "name": "$itemOneName",
      "price": "$itemOnePrice"
    },
    {
      "name": "$itemTwoName",
      "price": "$itemTwoPrice"
    },
    ...
  ]
}
```

orders: Holds data about pending orders. This file is generally cleared every
day at midnight. The `isCallee` param represents whether the user is receiving
the call for this order and is used when announcing the arrival of food.
```
{
  "username": "$username",
  "restaurant": "$restaurantName",
  "isCallee": false,
  "items": [
    [
      "$itemOneName",
      [
        "$optionA",
        "$optionB"
      ]
    ],
    [
      "$itemTwoName",
      []
    ],
    ...
  ]
}
```

stats: Holds statistics about which items were ordered by which users for which
restaurants, in addition to dollar amount per restaurant. Also contains how many
calls the user has received for pickup.
```
{
  "username": "$username",
  "calls": $callNumber,
  "restaurants": {
    "$restaurantOne": {
      "dollars": $dollarValue,
      "items:" {
        "$itemOneName": $itemOneQuantity,
        "$itemTwoName": $itemTwoQuantity,
        ...
      }
    },
    ...
  }
}
```

users: Holds information that Alfred needs for each user.
```
{
  "username": "$slackUsername",
  "name": "$fullName",
  "phone": "$phoneNumber",
  "slackId": "$slackId",
  "favorite": {
    "restaurant": "$restaurantName",
    "items": [
      [
        "$itemOneName",
        [
          "$optionA",
          "$optionB"
        ]
      ],
      [
        "$itemTwoName",
        []
      ]
      ...
    ]
  }
}
```

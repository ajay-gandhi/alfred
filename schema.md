# Data schema

All of these files lie in the `data/` subdirectory.

`menu_data.json`: Scraped data for every menu on Seamless. Some price values may
be `false`; this is because some prices depend on the selected options.
```
{
  "$restaurantName": {
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
  },
  ...
}
```

`orders.json`: Holds data about pending orders. This file is generally cleared
every day at 3:30pm when the orders are inputted.
```
{
  "$user": {
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
      ],
      ...
    ]
  },
  ...
}
```

`stats.json`: Holds statistics about which items were ordered by which users for
which restaurants, in addition to dollar amount per restaurant. Also stores how
many calls the user has received for pickup.
```
{
  "$user": {
    "calls": $callNumber,
    "$restaurantOne": {
      "dollars": $dollarValue,
      "items:" {
        "$itemOneName": $itemOneQuantity,
        "$itemTwoName": $itemTwoQuantity,
        ...
      }
    },
    ...
  },
  ...
}
```

`users.json`: Holds information that Alfred needs for each user.
```
{
  "$user": {
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
  },
  ...
}
```

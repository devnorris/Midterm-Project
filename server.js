"use strict";

require("dotenv").config();

const PORT = process.env.PORT || 8080;
const ENV = process.env.ENV || "development";
const express = require("express");
const bodyParser = require("body-parser");
const sass = require("node-sass-middleware");
const app = express();

const imdb = require("imdb-api");
const axios = require("axios");
const ebay = require("ebay-api");

const yelpKey = process.env.yelpKey;
const ebayID = process.env.ebayID;
const imdbKey = process.env.imdbKey;

const knexConfig = require("./knexfile");
const knex = require("knex")(knexConfig[ENV]);
const morgan = require("morgan");
const knexLogger = require("knex-logger");
const Functions = require("./data-helpers.js");
// Seperated Routes for each Resource
const usersRoutes = require("./routes/users");

const yelpConfig = {
  headers: { Authorization: yelpKey },
  params: {
    name: "",
    location: "Montreal"
  }
};

// Load the logger first so all (static) HTTP requests are logged to STDOUT
// 'dev' = Concise output colored by response status for development use.
//         The :status token will be colored red for server error codes, yellow for client error codes, cyan for redirection codes, and uncolored for all other codes.
app.use(morgan("dev"));

// Log knex SQL queries to STDOUT as well
app.use(knexLogger(knex));

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  "/styles",
  sass({
    src: __dirname + "/styles",
    dest: __dirname + "/public/styles",
    debug: true,
    outputStyle: "expanded"
  })
);
app.use(express.static("public"));

// Mount all resource routes
app.use("/api/users", usersRoutes(knex));

// Home page
app.get("/", (req, res) => {
  res.render("index");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  knex("users")
    .insert({
      email: req.body.email,
      password: req.body.password
    })
    .then(console.log("done"))
    .catch(err => console.log("error: ", err))

  res.redirect("/smart");
});

app.post("/login", (req, res) => {
  knex
    .from("users")
    .where({ email: `${req.body.email}` })
    .then(result => {
      console.log("user is ", result);
    });
}); //get login
app.get("/smart", (req, res) => {
  console.log("user logged in and verified");
  res.render("usersHome");
});

app.post("/smart", (req, res) => {
  let anchorWord = req.body.search.split(" ")[0].toLowerCase();
  let taskAdded = req.body.search
    .split(" ")
    .slice(1)
    .join(" ")
    .toLowerCase();
  let responseObj = { keyword: anchorWord, value: taskAdded };
  if (anchorWord === "eat") {
    yelpConfig.params.term = taskAdded; // Find restaurants

    axios
      .get("https://api.yelp.com/v3/businesses/search", yelpConfig)
      .then(response => {
        let businessList = response.data.businesses;
        console.log(`${businessList[0].name}, ${businessList[0].rating}, ${businessList[0].location.address1}`);

    knex("todo") // knex call to add api item to todo_reference
      .insert({
        todo_name: `${responseObj.keyword} ${responseObj.value}`,
        todo_reference: `${businessList[0].name}, ${businessList[0].rating}, ${businessList[0].location.address1}`
      })
      .then(console.log("done"))
      .catch(err => console.log("error: ", err))
      })
      .catch(error => {
        console.log("Error!");
      });
  } //if eat
  // // ----------------------------------------------------------------------------------------------------------
  else if (anchorWord === "watch") {
    const findMovie = search => {
      // Find movies
      imdb
        .search(
          {
            title: `${taskAdded}`
          },
          {
            apiKey: "b1b27127"
          }
        )
        .then(result => {
          let movieArray = result.results;
          console.log(movieArray);

            if (movieArray[0].title.toLowerCase() === taskAdded.toLowerCase()) {
              console.log(`${movieArray[0].title}, ${movieArray[0].year}`);

      knex("todo")// knex call to add api item to todo_reference
        .insert({
          todo_name: `${responseObj.keyword} ${responseObj.value}`,
          todo_reference: `${movieArray[0].title}, ${movieArray[0].year}`
          })
        .then(console.log("done"))
        .catch(err => console.log("error: ", err))

          }
        })
        .catch(console.log);
    }; //else if watch

    findMovie(taskAdded);


  } else if (anchorWord === "read") {
    const paramsBooks = {
      keywords: `${taskAdded}, Books`, // Search Ebay for Books
      domainFilter: [{ name: "domainName", value: "Books" }]
    };

    ebay.xmlRequest(
      {
        serviceName: "Finding",
        opType: "findItemsByKeywords",
        appId: ebayID,
        params: paramsBooks,
        parser: ebay.parseResponseJson
      },
      // gets all the items together in a merged array
      function itemsCallback(error, itemsResponse) {
        if (error) throw error;

        let items = itemsResponse.searchResult.item;

        console.log(items[0].title);

      knex("todo") // knex call to add api item to todo_reference
        .insert({
          todo_name: `${responseObj.keyword} ${responseObj.value}`,
          todo_reference: `${items[0].title}`
          })
        .then(console.log("done"))
        .catch(err => console.log("error: ", err))
      }
    ); //ebay api call
  } else if (anchorWord === "buy") {
    const paramsProduct = {
      keywords: `${taskAdded}`, // Search Ebay for products
      domainFilter: [{ name: "domainName", value: "Books" }]
    };

    ebay.xmlRequest(
      {
        serviceName: "Finding",
        opType: "findItemsByKeywords",
        appId: ebayID,
        params: paramsProduct,
        parser: ebay.parseResponseJson
      },
      // gets all the items together in a merged array
      function itemsCallback(error, itemsResponse) {
        if (error) throw error;

        let items = itemsResponse.searchResult.item;
        console.log(items[0]);

      knex("todo") // knex call to add api item to todo_reference
        .insert({
          todo_name: `${responseObj.keyword} ${responseObj.value}`,
          todo_reference: `${items[0].title}, ${items[0].sellingStatus.currentPrice.amount}`
          })
        .then(console.log("done"))
        .catch(err => console.log("error: ", err))
      }
    );
  } //else if buy

// knex("todo")
//     .insert({
//       todo_name: `${responseObj.keyword} ${responseObj.value}`
//     })
//     .then(console.log("done"))
//     .catch(err => console.log("error: ", err))

knex('category')
    .insert({
      category_name: `${responseObj.keyword}`
    })
    .then(console.log("done"))
    .catch(err => console.log("error: ", err))

  res.send(responseObj);
}); //post "/smart"

app.listen(PORT, () => {
  console.log("Example app listening on port " + PORT);
});

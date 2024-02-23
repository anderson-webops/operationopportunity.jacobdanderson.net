const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const app = express();

// parse application/x-www-form-urlencoded
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);

// parse application/json
app.use(bodyParser.json());

// connect to the database
mongoose.connect('mongodb://localhost:27017/operationopportunity');

const cookieParser = require("cookie-parser");
app.use(cookieParser());

const cookieSession = require("cookie-session");
app.use(
  cookieSession({
    name: "session",
    keys: ["secretValue"],
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

const tutors = require("./tutors.js");
app.use("/api/tutors", tutors.routes);

const users = require("./users.js");
app.use("/api/users", users.routes);

const admins = require("./admins.js");
app.use("/api/admins", admins.routes);

const accounts = require("./accounts.js");
app.use("/api/accounts", accounts.routes);

app.listen(3002, () => console.log("Server listening on port 3002!"));

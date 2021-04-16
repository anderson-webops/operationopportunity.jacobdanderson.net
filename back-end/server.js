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
mongoose.connect("mongodb://localhost:27017/operationopportunity", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

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

// import the users module and setup its API path
const users = require("./users.js");
app.use("/api/users", users.routes);

// Catch Error
/*app.post("/api/error/:error", async (req, res) => {
  console.log(`${req.params.error} at line: ${req.params.lineNumber}`);
  res.sendStatus(500).send({
    message: `Error: ${req.params.error} at line: ${req.params.error.lineNumber}`,
  });
});*/

app.listen(3002, () => console.log("Server listening on port 3002!"));

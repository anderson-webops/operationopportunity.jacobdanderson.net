const reader = require("readline-sync");
const mongoose = require("mongoose");

const admins = require("./admins.js");
const Admin = admins.model;

// connect to Mongo
mongoose.connect("mongodb://localhost:27017/operationopportunity", {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

// get the needed info
let name = reader.question("Name: ");
let username = reader.question("Username or email: ");
const password = reader.question("Password: ", {
  hideEchoBack: true,
});

if (name === "" || username === "" || password === "") {
  console.log(
    "You need to enter a first name, last name, username, and password"
  );
  process.exit();
}

Admin.findOne({
  email: username,
})
  .then((admin) => {
    if (admin) {
      console.log("That username already exists");
      process.exit();
    }
  })
  .then(() => {
    let admin = new Admin({
      name: name,
      email: username,
      password: password,
      editUsers: false,
      saveEdit: "Edit",
      role: "admin",
    });
    admin.save().then(() => {
      console.log(
        "OK, admin user created for",
        name,
        "with username",
        username
      );
      process.exit();
    });
  })
  .catch((error) => {
    console.log("Error in create-admin-user.js User.findOne()");
    console.log(error);
  });

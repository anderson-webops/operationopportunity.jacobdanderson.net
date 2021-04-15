const mongoose = require("mongoose");
const express = require("express");

const router = express.Router();

/*****************************
 *   NumberOfUsers Methods   *
 ****************************/

// Schema for users
const numberOfUsersSchema = new mongoose.Schema({
  numberOfUsers: {
    type: Number,
    default: 0,
  },
});

// Model for users
const UserAmount = mongoose.model("UserAmount", numberOfUsersSchema);

// Log the amount of users
router.post("/", async (req, res) => {
  try {
    let userAmount = new UserAmount({
      numberOfUsers: req.body.numberOfUsers,
    });
    await userAmount.save();
    return res.send(userAmount[0]);
  } catch (error) {
    console.log(`${error} at line: ${error.lineNumber}`);
    return res.sendStatus(500).send({
      message: `Error: ${error} at line: ${error.lineNumber}`,
    });
  }
});

// Update user info
router.put("/", async (req, res) => {
  try {
    let userAmount = await UserAmount.find();
    if (!userAmount) {
      return res.sendStatus(404);
    }
    console.log("Req.body.numberOfUsers: ", req.body.numberOfUsers);
    if (req.body.numberOfUsers == null || req.body.numberOfUsers <= 0) {
      req.body.numberOfUsers = 0;
      console.log("Req.body.numberOfUsers: ", req.body.numberOfUsers);
    }
    console.log("userAmount[0].numberOfUsers: ", userAmount[0].numberOfUsers);
    userAmount[0].numberOfUsers = req.body.numberOfUsers;
    console.log("userAmount[0].numberOfUsers: ", userAmount[0].numberOfUsers);
    await userAmount[0].save();
    return res.sendStatus(200);
  } catch (error) {
    console.log(`${error} at line: ${error.lineNumber}`);
    return res.sendStatus(500).send({
      message: `Error: ${error} at line: ${error.lineNumber}`,
    });
  }
});

// Get the number of users
router.get("/", async (req, res) => {
  try {
    let userAmount = await UserAmount.find();
    if (!userAmount) {
      return res.sendStatus(404);
    }
    return res.send(userAmount[0]);
  } catch (error) {
    console.log(`${error} at line: ${error.lineNumber}`);
    return res.sendStatus(500).send({
      message: `Error: ${error} at line: ${error.lineNumber}`,
    });
  }
});

module.exports = {
  model: UserAmount,
  routes: router,
};

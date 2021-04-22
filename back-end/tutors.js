const mongoose = require("mongoose");
const express = require("express");
const argon2 = require("argon2");

const router = express.Router();

/********************
 *   Tutor Methods   *
 ********************/

// Create a scheme for tutors
const tutorSchema = new mongoose.Schema({
  name: String,
  email: String,
  age: String,
  state: String,
  password: String,
  usersOfTutorLength: Number,
  editTutors: Boolean,
  saveEdit: String,
  role: {
    type: String,
    default: "tutor",
  },
});

// This is a hook that will be called before a user record is saved,
// allowing us to be sure to salt and hash the password first.
tutorSchema.pre("save", async function (next) {
  // only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();

  try {
    // generate a hash. argon2 does the salting and hashing for us and
    // override the plaintext password with the hashed one
    this.password = await argon2.hash(this.password); //was variable hash
    next();
  } catch (error) {
    console.log(`Error: ${error}`);
    next(error);
  }
});

// This is a method that we can call on User objects to compare the hash of the
// password the browser sends with the has of the user's true password stored in
// the database.
tutorSchema.methods.comparePassword = async function (password) {
  try {
    // note that we supply the hash stored in the database (first argument) and
    // the plaintext password. argon2 will do the hashing and salting and
    // comparison for us.
    return await argon2.verify(this.password, password); //was variable isMatch
  } catch (error) {
    return false;
  }
};

// This is a method that will be called automatically any time we convert a user
// object to JSON. It deletes the password hash from the object. This ensures
// that we never send password hashes over our API, to avoid giving away
// anything to an attacker.
tutorSchema.methods.toJSON = function () {
  let obj = this.toObject();
  delete obj.password;
  return obj;
};

// Create a model for tutors
const Tutor = mongoose.model("Tutor", tutorSchema);

/* Middleware */

// middleware function to check for logged-in users
// eslint-disable-next-line no-unused-vars
const validTutor = async (req, res, next) => {
  if (!req.session.tutorID)
    return res.status(403).send({
      message: "not logged in",
    });
  try {
    const tutor = await Tutor.findOne({
      _id: req.session.tutorID,
    });
    if (!tutor) {
      return res.status(403).send({
        message: "not logged in",
      });
    }
    // set the user field in the request
    req.currentTutor = tutor;
  } catch (error) {
    // Return an error if user does not exist.
    return res.status(403).send({
      message: "not logged in",
    });
  }

  // if everything succeeds, move to the next middleware
  next();
};

// Create a tutor
router.post("/", async (req, res) => {
  if (
    !req.body.name ||
    !req.body.age ||
    !req.body.state ||
    !req.body.email ||
    !req.body.password
  )
    return res.status(400).send({ message: "All fields required" });
  try {
    // existing account name is checked in a separate call in user.js

    const tutor = new Tutor({
      name: req.body.name,
      email: req.body.email,
      age: req.body.age,
      state: req.body.state,
      password: req.body.password,
      usersOfTutorLength: 0,
      editTutors: req.body.editTutors,
      saveEdit: req.body.saveEdit,
    });
    await tutor.save();
    // set user session info
    req.session.tutorID = tutor._id;
    return res.send({ currentTutor: tutor });
  } catch (error) {
    console.log(`Error: ${error}`);
    return res.sendStatus(500).send({
      message: `Error: ${error}`,
    });
  }
});

// Get a list of all tutors
router.get("/", async (req, res) => {
  try {
    let tutors = await Tutor.find();
    return res.send(tutors);
  } catch (error) {
    console.log(`Error: ${error}`);
    return res.sendStatus(500).send({
      message: `Error: ${error}`,
    });
  }
});

// Update tutor info
router.put("/:tutorID", validTutor, async (req, res) => {
  try {
    let editedTutor = await Tutor.findOne({ _id: req.params.tutorID });
    if (!editedTutor) {
      return res.send(404);
    }
    editedTutor.name = req.body.name;
    editedTutor.email = req.body.email;
    editedTutor.age = req.body.age;
    editedTutor.state = req.body.state;
    editedTutor.usersOfTutorLength = req.body.usersOfTutorLength;
    editedTutor.editTutors = req.body.editTutors;
    editedTutor.saveEdit = req.body.saveEdit;
    await editedTutor.save();
    return res.sendStatus(200);
  } catch (error) {
    console.log(`Error: ${error}`);
    return res.sendStatus(500).send({
      message: `Error: ${error}`,
    });
  }
});

// get logged in user
router.get("/loggedin", validTutor, async (req, res) => {
  try {
    res.send({
      currentTutor: req.currentTutor,
    });
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

// Delete a tutor
router.delete("/remove/:tutorID", async (req, res) => {
  try {
    let tutor = await Tutor.findOne({ _id: req.params.tutorID });
    if (!tutor) {
      return res.sendStatus(404);
    }
    await tutor.delete();
    return res.sendStatus(200);
  } catch (error) {
    console.log(`Error: ${error}`);
    return res.sendStatus(500).send({
      message: `Error: ${error}`,
    });
  }
});

// logout
router.delete("/logout", validTutor, async (req, res) => {
  try {
    req.session = null;
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

module.exports = {
  model: Tutor,
  routes: router,
  valid: validTutor,
};

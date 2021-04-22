const express = require("express");
const mongoose = require("mongoose");
const argon2 = require("argon2");

const router = express.Router();

const tutors = require("./tutors.js");
const Tutor = tutors.model;

const users = require("./users.js");
const User = users.model;

/********************
 *   Admin Methods   *
 *******************/

// This is the schema. Admins have usernames and passwords. We solemnly promise to
// Schema for admins
const adminSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  editAdmins: Boolean,
  saveEdit: String,
  role: {
    type: String,
    default: "admin",
  },
});

// This is a hook that will be called before a admin record is saved,
// allowing us to be sure to salt and hash the password first.
adminSchema.pre("save", async function (next) {
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

// This is a method that we can call on Admin objects to compare the hash of the
// password the browser sends with the has of the admin's true password stored in
// the database.
adminSchema.methods.comparePassword = async function (password) {
  try {
    // note that we supply the hash stored in the database (first argument) and
    // the plaintext password. argon2 will do the hashing and salting and
    // comparison for us.
    return await argon2.verify(this.password, password); //was variable isMatch
  } catch (error) {
    return false;
  }
};

// This is a method that will be called automatically any time we convert a admin
// object to JSON. It deletes the password hash from the object. This ensures
// that we never send password hashes over our API, to avoid giving away
// anything to an attacker.
adminSchema.methods.toJSON = function () {
  let obj = this.toObject();
  delete obj.password;
  return obj;
};

// create a Admin model from the Admin schema
const Admin = mongoose.model("Admin", adminSchema);

/* Middleware */

// middleware function to check for logged-in admins
// eslint-disable-next-line no-unused-vars
const validAdmin = async (req, res, next) => {
  if (!req.session.adminID)
    return res.status(403).send({
      message: "not logged in",
    });
  try {
    const admin = await Admin.findOne({
      _id: req.session.adminID,
    });
    if (!admin) {
      return res.status(403).send({
        message: "not logged in",
      });
    }
    // set the admin field in the request
    req.currentAdmin = admin;
  } catch (error) {
    // Return an error if admin does not exist.
    return res.status(403).send({
      message: "not logged in",
    });
  }

  // if everything succeeds, move to the next middleware
  next();
};

// Create a admin
router.post("/", async (req, res) => {
  if (!req.body.name || !req.body.email || !req.body.password)
    return res.status(400).send({ message: "All fields required" });
  try {
    let admin = new Admin({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      editAdmins: req.body.editAdmins,
      saveEdit: req.body.saveEdit,
    });
    await admin.save();
    req.session.adminID = admin._id;
    return res.send({ currentAdmin: admin });
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

// Get all admins
router.get("/", async (req, res) => {
  try {
    let admins = await Admin.find();
    return res.send(admins);
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

// Update admin info
router.put("/:adminID", async (req, res) => {
  try {
    let admin = await Admin.findOne({
      _id: req.params.adminID,
    });
    if (!admin) {
      return res.sendStatus(404);
    }
    admin.name = req.body.name;
    admin.email = req.body.email;
    // admin.age = req.body.age;
    // admin.state = req.body.state;
    admin.editAdmins = req.body.editAdmins;
    admin.saveEdit = req.body.saveEdit;
    await admin.save();
    return res.sendStatus(200);
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

// Delete the admin
router.delete("/remove/:adminID", validAdmin, async (req, res) => {
  try {
    let admin = await Admin.findOne({
      _id: req.params.adminID,
    });
    if (!admin) {
      return res.sendStatus(404);
    }
    await admin.delete();

    return res.sendStatus(200);
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

// get logged in admin
router.get("/loggedin", validAdmin, async (req, res) => {
  try {
    res.send({
      currentAdmin: req.currentAdmin,
    });
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

/*   Tutor Edits   */

// Update tutor info
router.put("/tutor/:tutorID", validAdmin, async (req, res) => {
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

// Delete a tutor
router.delete("/tutor/:tutorID", validAdmin, async (req, res) => {
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

/*   User Edits   */

// Update user info
router.put("/user/:userID", validAdmin, async (req, res) => {
  try {
    let user = await User.findOne({
      _id: req.params.userID,
    });
    if (!user) {
      return res.sendStatus(404);
    }
    user.name = req.body.name;
    user.email = req.body.email;
    user.age = req.body.age;
    user.state = req.body.state;
    user.editUsers = req.body.editUsers;
    user.saveEdit = req.body.saveEdit;
    await user.save();
    return res.sendStatus(200);
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

// Delete the user
router.delete("/user/:userID", validAdmin, async (req, res) => {
  try {
    let user = await User.findOne({
      _id: req.params.userID,
    });
    if (!user) {
      return res.sendStatus(404);
    }
    await user.delete();

    return res.sendStatus(200);
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

module.exports = {
  model: Admin,
  routes: router,
  valid: validAdmin,
};

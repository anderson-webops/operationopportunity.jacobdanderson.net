const express = require("express");

const router = express.Router();

const admins = require("./admins.js");
const Admin = admins.model;

const tutors = require("./tutors.js");
const Tutor = tutors.model;

const users = require("./users.js");
const User = users.model;

// Create an account
router.post("/", async (req, res) => {
  if (!req.body.email)
    return res.status(400).send({ message: "Email field required" });
  try {
    const existingUser = await User.findOne({
      email: req.body.email,
    });
    const existingTutor = await Tutor.findOne({
      email: req.body.email,
    });
    const existingAdmin = await Admin.findOne({
      email: req.body.email,
    });
    if (existingUser || existingTutor || existingAdmin)
      return res.status(403).send({
        message: "username already exists",
      });
    return res.sendStatus(200);
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

router.post("/changeEmail/:ID", async (req, res) => {
  try {
    let tutorID = await Tutor.findOne({ _id: req.params.ID });
    let userID = await User.findOne({ _id: req.params.ID });
    let adminID = await Admin.findOne({ _id: req.params.ID });
    let userTypeWithID = tutorID ? tutorID : userID ? userID : adminID;

    let tutor = await Tutor.findOne({
      email: req.body.email,
    });
    let user = await User.findOne({
      email: req.body.email,
    });
    let admin = await Admin.findOne({
      email: req.body.email,
    });
    let userTypeWithEmail = tutor ? tutor : user ? user : admin;

    // Return an error if user does not exist.
    if (userTypeWithEmail && userTypeWithEmail.email !== userTypeWithID.email)
      return res.status(403).send({
        message: "username already exhists",
      });

    else return res.sendStatus(200);
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

// login
router.post("/login", async (req, res) => {
  // Make sure that the form coming from the browser includes a username and a
  // password, otherwise return an error.
  if (!req.body.email || !req.body.password) return res.sendStatus(400);

  try {
    //  lookup user record
    const tutor = await Tutor.findOne({
      email: req.body.email,
    });
    const user = await User.findOne({
      email: req.body.email,
    });
    const admin = await Admin.findOne({
      email: req.body.email,
    });
    // Return an error if user does not exist.
    if (!tutor && !user && !admin)
      return res.status(403).send({
        message: "username or password is incorrect",
      });

    // Return the SAME error if the password is wrong. This ensure we don't
    // leak any information about which users exist.
    if (tutor != null)
      if (!(await tutor.comparePassword(req.body.password)))
        return res.status(403).send({
          message: "username or password is incorrect",
        });
    if (user != null)
      if (!(await user.comparePassword(req.body.password)))
        return res.status(403).send({
          message: "username or password is incorrect",
        });
    if (admin != null)
      if (!(await admin.comparePassword(req.body.password)))
        return res.status(403).send({
          message: "username or password is incorrect",
        });

    // set user session info
    if (admin) {
      req.session.adminID = admin._id;
      return res.send({
        currentAdmin: admin,
      });
    } else if (tutor) {
      req.session.tutorID = tutor._id;
      return res.send({
        currentTutor: tutor,
      });
    } else if (user) {
      req.session.userID = user._id;
      return res.send({
        currentUser: user,
      });
    } else {
      return res.status(403).send({
        message: "No user, tutor nor admin",
      });
    }
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

module.exports = {
  routes: router,
};

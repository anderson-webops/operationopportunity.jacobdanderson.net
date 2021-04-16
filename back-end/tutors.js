const mongoose = require("mongoose");
const express = require("express");

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
  editTutors: Boolean,
  saveEdit: String,
});

// Create a model for tutors
const Tutor = mongoose.model("Tutor", tutorSchema);

// Create a tutor
router.post("/", async (req, res) => {
  const tutor = new Tutor({
    name: req.body.name,
    email: req.body.email,
    age: req.body.age,
    state: req.body.state,
    password: req.body.password,
    editTutors: req.body.editTutors,
    saveEdit: req.body.saveEdit,
  });
  try {
    await tutor.save();
    return res.send(tutor);
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
router.put("/:tutorID", async (req, res) => {
  try {
    let editedTutor = await Tutor.findOne({ _id: req.params.tutorID });
    if (!editedTutor) {
      return res.send(404);
    }
    editedTutor.name = req.body.name;
    editedTutor.email = req.body.email;
    editedTutor.age = req.body.age;
    editedTutor.state = req.body.state;
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
router.delete("/:tutorID", async (req, res) => {
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

module.exports = {
  model: Tutor,
  routes: router,
};

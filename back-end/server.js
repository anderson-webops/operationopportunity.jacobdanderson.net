const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: false
}));

// parse application/json
app.use(bodyParser.json());

// connect to the database
mongoose.connect('mongodb://localhost:27017/operationopportunity', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Create a scheme for projects
/*const projectSchema = new mongoose.Schema({
    name: String,
    color: String
});*/

// Create a model for projects
// const Project = mongoose.model('Project', projectSchema);

// Create a project
app.post('/api/', async (req, res) => {
/*    const project = new Project({
        name: req.body.name,
        color: req.body.color
    });*/
    try {
/*        await project.save();
        res.send(project);*/
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

// Get a list of all projects
app.get('/api/', async (req, res) => {
    try {
/*        let projects = await Project.find();
        res.send(projects);*/
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

// Schema for items
const itemSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.ObjectId,
        ref: 'Project'
    },
    text: String,
    completed: Boolean,
})

// Model for items
// const Item = mongoose.model('Item',itemSchema);

app.post('/api/', async (req, res) => {
    try {
/*        let project = await Project.findOne({_id: req.params.projectID});
        if (!project) {
            res.sendStatus(404);
            return;
        }
        let item = new Item({
            project: project,
            text: req.body.text,
            completed: req.body.completed,
        });
        await item.save();
        res.send(item);*/
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

app.get('/api/', async (req, res) => {
    try {
/*        let project = await Project.findOne({_id: req.params.projectID});
        if (!project) {
            res.sendStatus(404);
            return;
        }
        let items = await Item.find({project:project});
        res.send(items);*/
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

app.put('/api/', async (req, res) => {
    try {
        /*let item = await Item.findOne({_id:req.params.itemID, project: req.params.projectID});
        if (!item) {
            res.send(404);
            return;
        }
        item.text = req.body.text;
        item.completed = req.body.completed;
        await item.save();
        res.send(item);*/
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

app.delete('/api/', async (req, res) => {
    try {
/*        let item = await Item.findOne({_id:req.params.itemID, project: req.params.projectID});
        if (!item) {
            res.send(404);
            return;
        }
        await item.delete();*/
        res.sendStatus(200);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

app.listen(3002, () => console.log('Server listening on port 3002!'));
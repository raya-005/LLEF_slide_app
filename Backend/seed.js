require("dotenv").config();
const mongoose = require("mongoose");
const Slide = require("./Slide");
const slidesToInsert = [
  
  {type: "simple",
    title: "HELLO",
    text: "Hi all, how are you?",
    vd: "Hi all, how are you?",
    image: "",
    time: 1},
  {type: "vq",
    rows: [
      {wd: "Electrical Circuit",
        vd: "Today we are going to learn about Electric Circuit (What is electrical circuit, how circuit is made)",
        multimedia: "circuit.jpg",
        studyMaterials: "Battery, wire, bulb",
        time: 0.5,
        isQuestion: false},
      {wd: "",
        vd: "What topic are we learning?",
        multimedia: "question.webp",
        studyMaterials: "",
        time: 0.5,
        isQuestion: true,
        answer: "Electric Circuit"},
      {wd: "",
        vd: "Ok let's get started",
        multimedia: "",
        studyMaterials: "",
        time: 0.01,
        isQuestion: false}]}];
mongoose.connect(process.env.MONGODB_URI)
  .then(function () {
    console.log("Connected to MongoDB, inserting data...");
    return Slide.insertMany(slidesToInsert);})
  .then(function () {
    console.log("Data inserted successfully!");
    mongoose.connection.close();})
  .catch(function (error) {
    console.log("Error:", error);});
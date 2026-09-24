require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGODB_URI)
  .then(function () {
    console.log("Connected to MongoDB!");
  })
  .catch(function (error) {
    console.log("MongoDB connection error:", error);});
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();});

app.use(express.json());
const slides = [
  {title: "HELLO",
    text: "Hi all, how are you?",
    vd: "Hi all, how are you?",
    image: "",
    time: "1"},
  {type: "vq",
    rows: [
      {
        wd: "Electrical Circuit",
        vd: "Today we are going to learn about Electric Circuit (What is electrical circuit, how circuit is made)",
        multimedia: "circuit.jpg",
        studyMaterials: "Battery, wire, bulb",
        time: "0.5"},
      {
        wd: "",
        vd: "What topic are we learning?",
        multimedia: "question.webp",
        studyMaterials: "",
        time: "0.5",
        isQuestion: true,
        answer: "Electric Circuit" },
      {
        wd: "",
        vd: "Ok let's get started",
        multimedia: "",
        studyMaterials: "",
        time: "0.01"}]}];
const savedAnswers = [];
app.get("/api/slides", (req, res) => {
  res.json(slides);});

app.post("/api/answers", (req, res) => {
  const receivedAnswer = req.body;

  savedAnswers.push(receivedAnswer);
  console.log("Saved answer:", receivedAnswer);
  console.log("Total answers so far:", savedAnswers.length);
  res.json({ message: "Answer saved successfully!" });});

app.get("/api/answers", (req, res) => {
  res.json(savedAnswers);});

app.listen(PORT, () => {
  console.log("Server is running on http://localhost:" + PORT);});
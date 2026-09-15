const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();});

const slides = [
  {title: "HELLO",
    text: "Hi all, how are you?",
    vd: "Hi all, how are you?",
    image: "",
    time: "1" },
  {type: "vq",
    rows: [
      {wd: "Electrical Circuit",
        vd: "Today we are going to learn about Electric Circuit (What is electrical circuit, how circuit is made)",
        multimedia: "circuit.jpg",
        studyMaterials: "Battery, wire, bulb",
        time: "0.5" },
      {wd: "",
        vd: "What topic are we learning?",
        multimedia: "question.webp",
        studyMaterials: "",
        time: "0.5",
        isQuestion: true,
        answer: "Electric Circuit" },
      {wd: "",
        vd: "Ok let's get started",
        multimedia: "",
        studyMaterials: "",
        time: "0.01"}]}];

app.get("/api/slides", (req, res) => {
  res.json(slides);});

app.listen(PORT, () => {
  console.log("Server is running on http://localhost:" + PORT);});
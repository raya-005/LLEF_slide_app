require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const Slide = require("./Slide");
const Answer = require("./Answer");
const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);}
  next();
});
app.use(express.json({ limit: "10mb" }));

mongoose.connect(process.env.MONGODB_URI)
  .then(function () {
    console.log("Connected to MongoDB!");
  })
  .catch(function (error) {
    console.log("MongoDB connection error:", error);});
function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}
const MAX_IMAGE_LENGTH = 1500000;

const MAX_IMAGES = 6;

function isImageTooBig(value) {
  return typeof value === "string" && value.length > MAX_IMAGE_LENGTH;}

// একাধিক ছবির তালিকা (images) নেয়; না থাকলে পুরোনো একটা ছবির ঘর (legacy) থেকে নেয়
function readImages(images, legacy) {
  let list = [];
  if (Array.isArray(images)) {
    list = images.filter(function (v) {
      return typeof v === "string" && v.trim() !== "";});}
  if (list.length === 0 && !isBlank(legacy)) {
    list = [legacy];}
  return list;}
function checkImages(list) {
  if (list.length > MAX_IMAGES) {
    return "Too many images. The maximum is " + MAX_IMAGES + ".";}
  for (let i = 0; i < list.length; i++) {
    if (isImageTooBig(list[i])) {
      return "An image is too large. Please choose a smaller image.";}}
  return "";}
function buildSlideData(body) {
  const slideType = body.type === "vq" ? "vq" : "simple";

  if (slideType === "simple") {
    const images = readImages(body.images, body.image);
    if (isBlank(body.text) && isBlank(body.vd) && images.length === 0) {
      return { error: "Add some text, a VD or an image." };}
    if (isBlank(body.time) || Number.isNaN(Number(body.time))) {
      return { error: "Time must be a number." };}
    const imageError = checkImages(images);
    if (imageError) {
      return { error: imageError };}

    return {
      data: {
        type: "simple",
        title: body.title || "",
        text: body.text || "",
        vd: body.vd || "",
        image: "",
        images: images,
        time: Number(body.time),
        rows: []}};}
  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return { error: "A vq slide needs at least one row." };}
  const rows = [];

  for (let i = 0; i < body.rows.length; i++) {
    const row = body.rows[i];
    const rowName = "Row " + (i + 1) + ": ";
    const rowImages = readImages(row.images, row.multimedia);
    if (isBlank(row.vd) && rowImages.length === 0 && isBlank(row.studyMaterials)) {
      return { error: rowName + "add at least a VD, an image or study materials." };
    }
    if (isBlank(row.time) || Number.isNaN(Number(row.time))) {
      return { error: rowName + "Time must be a number." };
    }
    const rowImageError = checkImages(rowImages);
    if (rowImageError) {
      return { error: rowName + rowImageError };
    }

    const isQuestion = row.isQuestion === true || row.isQuestion === "true";
    if (isQuestion && isBlank(row.vd)) {
      return { error: rowName + "a question needs a VD (the question text)." };
    }
    if (isQuestion && isBlank(row.answer)) {
      return { error: rowName + "a question needs a correct answer." };}

    rows.push({
      wd: row.wd || "",
      vd: row.vd || "",
      multimedia: "",
      images: rowImages,
      studyMaterials: row.studyMaterials || "",
      time: Number(row.time),
      isQuestion: isQuestion,
      answer: row.answer || ""});}

  return {
    data: {
      type: "vq",
      title: body.title || "",
      text: "",
      vd: "",
      image: "",
      images: [],
      time: 0,
      rows: rows}};}

app.get("/api/slides", async function (req, res) {
  try {
    const slidesFromDB = await Slide.find();
    res.json(slidesFromDB);
  } catch (error) {
    console.log("Error fetching slides:", error);
    res.status(500).json({ message: "Error fetching slides" });}});
app.post("/api/slides", async function (req, res) {
  try {
    const result = buildSlideData(req.body);

    if (result.error) {
      return res.status(400).json({ message: result.error });
    }

    const createdSlide = await Slide.create(result.data);
    res.status(201).json(createdSlide);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    console.log("Error creating slide:", error);
    res.status(500).json({ message: "Error creating slide" });}});
app.put("/api/slides/:id", async function (req, res) {
  try {
    const result = buildSlideData(req.body);

    if (result.error) {
      return res.status(400).json({ message: result.error });
    }

    const slide = await Slide.findById(req.params.id);

    if (!slide) {
      return res.status(404).json({ message: "Slide not found" });}
    slide.set(result.data);
    await slide.save();

    res.json(slide);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid slide id" });
    }
    console.log("Error updating slide:", error);
    res.status(500).json({ message: "Error updating slide" });}});
app.delete("/api/slides/:id", async function (req, res) {
  try {
    const deletedSlide = await Slide.findByIdAndDelete(req.params.id);

    if (!deletedSlide) {
      return res.status(404).json({ message: "Slide not found" });
    }

    res.json({ message: "Slide deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: "Invalid slide id" });
  }});

app.post("/api/answers", async function (req, res) {
  try {
    const body = req.body;

    if (isBlank(body.studentAnswer)) {
      return res.status(400).json({ message: "The answer is empty." });
    }

    const savedAnswer = await Answer.create({
      slideId: String(body.slideId || ""),
      questionId: String(body.questionId || ""),
      studentAnswer: String(body.studentAnswer).slice(0, 500),
      correctAnswer: String(body.correctAnswer || "").slice(0, 500),
      isCorrect: body.isCorrect === true
    });

    console.log("Saved answer:", savedAnswer._id.toString());

    res.json({ message: "Answer saved successfully!" });
  } catch (error) {
    console.log("Error saving answer:", error);
    res.status(500).json({ message: "Error saving answer" });
  }
});
app.get("/api/answers", async function (req, res) {
  try {
    const answers = await Answer.find().sort({ createdAt: -1 });
    res.json(answers);
  } catch (error) {
    console.log("Error fetching answers:", error);
    res.status(500).json({ message: "Error fetching answers" });
  }
});

app.listen(PORT, () => {
  console.log("Server is running on http://localhost:" + PORT);});
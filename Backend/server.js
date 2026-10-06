require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const Slide = require("./Slide");

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

  // Browser আগে একটা "preflight" (OPTIONS) request পাঠায়, সেটার সরাসরি উত্তর দেওয়া
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(function () {
    console.log("Connected to MongoDB!");
  })
  .catch(function (error) {
    console.log("MongoDB connection error:", error);
  });

const savedAnswers = [];

// ============================
// সব slide দেখা (আগের মতোই)
// ============================
app.get("/api/slides", async function (req, res) {
  try {
    const slidesFromDB = await Slide.find();
    res.json(slidesFromDB);
  } catch (error) {
    console.log("Error fetching slides:", error);
    res.status(500).json({ message: "Error fetching slides" });
  }
});

// ============================
// নতুন: admin form থেকে আসা data দিয়ে নতুন slide তৈরি করা
// ============================
app.post("/api/slides", async function (req, res) {
  try {
    const body = req.body;

    // শুধু দুই ধরনের slide: "simple" অথবা "vq"
    const slideType = body.type === "vq" ? "vq" : "simple";

    const newSlideData = {
      type: slideType,
      title: body.title || ""
    };

    if (slideType === "simple") {
      newSlideData.text = body.text || "";
      newSlideData.vd = body.vd || "";
      newSlideData.image = body.image || "";
      newSlideData.time = Number(body.time);
    } else {
      // vq slide-এ অন্তত একটা row থাকতে হবে
      if (!Array.isArray(body.rows) || body.rows.length === 0) {
        return res.status(400).json({ message: "A vq slide needs at least one row." });
      }

      // প্রতিটা row-এর data সঠিক type-এ রূপান্তর করা (Number, Boolean, String)
      newSlideData.rows = body.rows.map(function (row) {
        return {
          wd: row.wd || "",
          vd: row.vd,
          multimedia: row.multimedia || "",
          studyMaterials: row.studyMaterials || "",
          time: Number(row.time),
          isQuestion: row.isQuestion === true || row.isQuestion === "true",
          answer: row.answer || ""
        };
      });
    }

    const createdSlide = await Slide.create(newSlideData);
    res.status(201).json(createdSlide);
  } catch (error) {
    // Schema-র নিয়ম ভাঙলে (যেমন vd নেই, time সংখ্যা না) এখানে আসবে
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    console.log("Error creating slide:", error);
    res.status(500).json({ message: "Error creating slide" });
  }
});

// ============================
// নতুন: একটা slide মুছে ফেলা (id দিয়ে)
// ============================
app.delete("/api/slides/:id", async function (req, res) {
  try {
    const deletedSlide = await Slide.findByIdAndDelete(req.params.id);

    if (!deletedSlide) {
      return res.status(404).json({ message: "Slide not found" });
    }

    res.json({ message: "Slide deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: "Invalid slide id" });
  }
});

app.post("/api/answers", (req, res) => {
  const receivedAnswer = req.body;

  savedAnswers.push(receivedAnswer);

  console.log("Saved answer:", receivedAnswer);
  console.log("Total answers so far:", savedAnswers.length);

  res.json({ message: "Answer saved successfully!" });
});

app.get("/api/answers", (req, res) => {
  res.json(savedAnswers);
});

app.listen(PORT, () => {
  console.log("Server is running on http://localhost:" + PORT);
});
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
// কোনো মান ফাঁকা কিনা দেখা (undefined, null, বা শুধু space)
// ============================
function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

// ============================
// নতুন: POST আর PUT দুটোই এই একটা function ব্যবহার করে
// Admin form থেকে আসা data যাচাই করে, সঠিক type-এ (Number, Boolean, String) রূপান্তর করে
// ভুল পেলে { error: "..." } ফেরত দেয়, ঠিক থাকলে { data: {...} }
// ============================
function buildSlideData(body) {
  const slideType = body.type === "vq" ? "vq" : "simple";

  if (slideType === "simple") {
    if (isBlank(body.vd)) {
      return { error: "VD is required." };
    }
    if (isBlank(body.time) || Number.isNaN(Number(body.time))) {
      return { error: "Time must be a number." };
    }

    return {
      data: {
        type: "simple",
        title: body.title || "",
        text: body.text || "",
        vd: body.vd,
        image: body.image || "",
        time: Number(body.time),
        rows: []
      }
    };
  }

  // vq slide-এ অন্তত একটা row থাকতে হবে
  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return { error: "A vq slide needs at least one row." };
  }

  const rows = [];

  for (let i = 0; i < body.rows.length; i++) {
    const row = body.rows[i];
    const rowName = "Row " + (i + 1) + ": ";

    if (isBlank(row.vd)) {
      return { error: rowName + "VD is required." };
    }
    if (isBlank(row.time) || Number.isNaN(Number(row.time))) {
      return { error: rowName + "Time must be a number." };
    }

    const isQuestion = row.isQuestion === true || row.isQuestion === "true";

    if (isQuestion && isBlank(row.answer)) {
      return { error: rowName + "a question needs a correct answer." };
    }

    rows.push({
      wd: row.wd || "",
      vd: row.vd,
      multimedia: row.multimedia || "",
      studyMaterials: row.studyMaterials || "",
      time: Number(row.time),
      isQuestion: isQuestion,
      answer: row.answer || ""
    });
  }

  return {
    data: {
      type: "vq",
      title: body.title || "",
      text: "",
      vd: "",
      image: "",
      time: 0,
      rows: rows
    }
  };
}

// ============================
// সব slide দেখা
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
// নতুন slide তৈরি করা
// ============================
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
    res.status(500).json({ message: "Error creating slide" });
  }
});

// ============================
// নতুন: আগে থেকে থাকা একটা slide বদলানো (edit)
// ============================
app.put("/api/slides/:id", async function (req, res) {
  try {
    const result = buildSlideData(req.body);

    if (result.error) {
      return res.status(400).json({ message: result.error });
    }

    const slide = await Slide.findById(req.params.id);

    if (!slide) {
      return res.status(404).json({ message: "Slide not found" });
    }

    // সব field নতুন data দিয়ে বদলে দেওয়া (type বদলালে পুরনো field-ও পরিষ্কার হয়ে যায়)
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
    res.status(500).json({ message: "Error updating slide" });
  }
});

// ============================
// একটা slide মুছে ফেলা (id দিয়ে)
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
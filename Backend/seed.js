require("dotenv").config();
const mongoose = require("mongoose");
const Slide = require("./Slide");

// ============================
// এখন সব time value quotes ছাড়া (number), আগের মতো string না
// ============================
const slidesToInsert = [
  {
    type: "simple",
    title: "HELLO",
    text: "Hi all, how are you?",
    vd: "Hi all, how are you?",
    image: "",
    time: 1
  },
  {
    type: "vq",
    rows: [
      {
        wd: "Electrical Circuit",
        vd: "Today we are going to learn about Electric Circuit (What is electrical circuit, how circuit is made)",
        multimedia: "circuit.jpg",
        studyMaterials: "Battery, wire, bulb",
        time: 0.5,
        isQuestion: false
      },
      {
        wd: "",
        vd: "What topic are we learning?",
        multimedia: "question.webp",
        studyMaterials: "",
        time: 0.5,
        isQuestion: true,
        answer: "Electric Circuit"
      },
      {
        wd: "",
        vd: "Ok let's get started",
        multimedia: "",
        studyMaterials: "",
        time: 0.01,
        isQuestion: false
      }
    ]
  }
];

// ============================
// প্রথমে পুরনো সব data মুছে ফেলা, তারপর নতুন করে সঠিক type দিয়ে insert করা
// ============================
mongoose.connect(process.env.MONGODB_URI)
  .then(function () {
    console.log("Connected to MongoDB, clearing old data...");
    return Slide.deleteMany({});
  })
  .then(function () {
    console.log("Old data cleared. Inserting new data...");
    return Slide.insertMany(slidesToInsert);
  })
  .then(function () {
    console.log("Data inserted successfully with correct types!");
    mongoose.connection.close();
  })
  .catch(function (error) {
    console.log("Error:", error);
  });
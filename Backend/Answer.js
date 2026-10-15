const mongoose = require("mongoose");
const answerSchema = new mongoose.Schema({
  slideId: {
    type: String,
    default: ""
  },
  questionId: {
    type: String,
    default: ""
  },
  studentAnswer: {
    type: String,
    required: true
  },
  correctAnswer: {
    type: String,
    default: ""
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now}});
const Answer = mongoose.model("Answer", answerSchema);
module.exports = Answer;
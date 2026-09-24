const mongoose = require("mongoose");
const rowSchema = new mongoose.Schema({
  wd: {
    type: String,
    default: ""},
  vd: {
    type: String,
    required: true},
  multimedia: {
    type: String,
    default: ""},
  studyMaterials: {
    type: String,
    default: ""},
  time: {
    type: Number,
    required: true},
  isQuestion: {
    type: Boolean,
    default: false},
  answer: {
    type: String,
    default: "" }});
const slideSchema = new mongoose.Schema({
  type: {
    type: String,
    default: "simple"},
  title: {
    type: String,
    default: ""},
  text: {
    type: String,
    default: ""},
  vd: {
    type: String,
    default: ""},
  image: {
    type: String,
    default: ""},
  time: {
    type: Number,
    default: 0},
  rows: [rowSchema]});
const Slide = mongoose.model("Slide", slideSchema);
module.exports = Slide;
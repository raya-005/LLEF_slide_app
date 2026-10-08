let slides = [];
let currentIndex = 0;
let currentParts = [];
let partIndex = -1;

const SHOW_ONLY_CURRENT_ROW = true;
function escapeHtml(text) {
  if (text === undefined || text === null) {
    return "";}
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");}
function loadSlides() {
  fetch("https://llef-slide-app.onrender.com/api/slides")
    .then(function (response) {
      return response.json();})
    .then(function (data) {
      slides = data;
      showSlide();})
    .catch(function (error) {
      console.log("Error loading slides:", error);
      alert("Could not load slides from the server. Is the backend running?");});}
function getHeaderTitle(slide) {
  if (slide.title) {
    return slide.title;}

  if (slide.type === "vq") {
    for (let i = 0; i < slide.rows.length; i++) {
      if (slide.rows[i].wd) {
        return slide.rows[i].wd;}}}
  return "";}
function buildPartsForSlide(slide) {
  const parts = [];

  if (slide.type === "vq") {
    for (let i = 0; i < slide.rows.length; i++) {
      const row = slide.rows[i];
      parts.push({
        kind: "text",
        vd: row.vd,
        studyMaterials: row.studyMaterials,
        time: Number(row.time),
        isQuestion: row.isQuestion,
        answer: row.answer});

      if (row.multimedia) {
        parts.push({
          kind: "media",
          multimedia: row.multimedia,
          time: 0
        });}}
  } else {
    parts.push({
      kind: "text",
      vd: slide.vd,
      simpleText: slide.text,
      studyMaterials: "",
      time: Number(slide.time),
      isQuestion: false,
      answer: ""});
    if (slide.image) {
      parts.push({
        kind: "media",
        multimedia: slide.image,
        time: 0});}}
  return parts;}

function showSlide() {
  const slide = slides[currentIndex];
  if (!slide) {
    document.getElementById("progressText").textContent = "No slides yet";
    document.getElementById("slideBox").innerHTML =
      "<div class='slideHeader'></div>" +
      "<div class='slideBody'><p>No slides yet. Add some from the admin page.</p></div>" +
      "<div class='slideFooter'></div>";
    return;}

  document.getElementById("progressText").textContent =
    "Slide " + (currentIndex + 1) + " of " + slides.length;
  const headerTitle = getHeaderTitle(slide);
  const box = document.getElementById("slideBox");
  box.innerHTML =
    "<div class='slideHeader'>" + escapeHtml(headerTitle) + "</div>" +
    "<div class='slideBody' id='slideBodyContent'></div>" +
    "<div class='slideFooter' id='slideFooterContent'></div>";
  document.getElementById("slideBodyContent").addEventListener("click", revealNextPart);

  currentParts = buildPartsForSlide(slide);
  partIndex = -1;}
function revealNextPart() {
  if (partIndex >= currentParts.length - 1) {
    return;}
  partIndex = partIndex + 1;
  const part = currentParts[partIndex];
  const uniqueId = currentIndex + "_" + partIndex;
  const bodyContent = document.getElementById("slideBodyContent");
  if (partIndex === 0 || (SHOW_ONLY_CURRENT_ROW && part.kind === "text")) {
    bodyContent.innerHTML = "";}
  let partHTML = "<div class='rowBlock'>";
  if (part.kind === "text") {
    const textId = "partText_" + uniqueId;

    if (part.simpleText) {
      partHTML = partHTML + "<p id='" + textId + "' class='partText'>" + escapeHtml(part.simpleText) + "</p>";
    } else {
      partHTML = partHTML + "<p id='" + textId + "' class='partText'>" + escapeHtml(part.vd) + "</p>";}

    if (part.studyMaterials) {
      partHTML = partHTML + "<p class='studyMaterials'>Study materials: " + escapeHtml(part.studyMaterials) + "</p>";
    }

    if (part.isQuestion === true) {
      partHTML = partHTML + "<input type='text' class='vqInputBox' id='vqInput_" + uniqueId + "' placeholder='Type your answer'>";
      partHTML = partHTML + "<button class='vqSubmitBtn' id='vqSubmitBtn_" + uniqueId + "'>Submit</button>";
      partHTML = partHTML + "<p class='vqResponseText' id='vqResponse_" + uniqueId + "'></p>";}}

  if (part.kind === "media") {
    partHTML = partHTML + "<img src='" + escapeHtml(part.multimedia) + "' style='max-height:320px; object-fit:contain;'>";}

  partHTML = partHTML + "</div>";
  bodyContent.insertAdjacentHTML("beforeend", partHTML);

  if (part.kind === "text") {
    const textId = "partText_" + uniqueId;
    const textElement = document.getElementById(textId);

    textElement.addEventListener("click", function (event) {
      event.stopPropagation();
      speakText(part.vd);
    });}
  if (part.kind === "text" && part.isQuestion === true) {
    const submitButton = document.getElementById("vqSubmitBtn_" + uniqueId);

    submitButton.addEventListener("click", function (event) {
      event.stopPropagation();
      checkAnswer(uniqueId, part.answer);});
    const inputBox = document.getElementById("vqInput_" + uniqueId);
    inputBox.addEventListener("click", function (event) {
      event.stopPropagation();});}
  if (part.kind === "text") {
    speakText(part.vd);}
  let totalTime = 0;
  for (let i = 0; i <= partIndex; i++) {
    totalTime = totalTime + currentParts[i].time;}
  totalTime = Math.round(totalTime * 100) / 100;
  let footerText = "Time: " + totalTime + " min";
  if (partIndex < currentParts.length - 1) {
    footerText = footerText + "  •  Click for more";}

  document.getElementById("slideFooterContent").textContent = footerText;}

function checkAnswer(uniqueId, correctAnswer) {
  const inputBox = document.getElementById("vqInput_" + uniqueId);
  const responseText = document.getElementById("vqResponse_" + uniqueId);
  const studentAnswer = inputBox.value;
  if (studentAnswer === "") {
    alert("Please type an answer first.");
    return;}
  let isCorrect;
  if (studentAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
    responseText.textContent = "Correct!";
    responseText.style.color = "green";
    isCorrect = true;
  } else {
    responseText.textContent = "Wrong. Correct answer: " + correctAnswer;
    responseText.style.color = "red";
    isCorrect = false;}
  saveAnswerToBackend(uniqueId, studentAnswer, correctAnswer, isCorrect);}
function saveAnswerToBackend(uniqueId, studentAnswer, correctAnswer, isCorrect) {
  fetch("https://llef-slide-app.onrender.com/api/answers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"},
    body: JSON.stringify({
      questionId: uniqueId,
      studentAnswer: studentAnswer,
      correctAnswer: correctAnswer,
      isCorrect: isCorrect})})
    .then(function (response) {
      return response.json();})
    .then(function (data) {
      console.log("Answer saved:", data);})
    .catch(function (error) {
      console.log("Error saving answer:", error);});}

function goNext() {
  const lastIndex = slides.length - 1;
  if (currentIndex < lastIndex) {
    currentIndex = currentIndex + 1;
    showSlide();}}
function goPrev() {
  if (currentIndex > 0) {
    currentIndex = currentIndex - 1;
    showSlide();}}
function speakText(text) {
  speechSynthesis.cancel();
  const speech = new SpeechSynthesisUtterance(text);
  speechSynthesis.speak(speech);}
function playAudio() {
  if (partIndex < 0) {
    return;}
  let textToSpeak = "";
  for (let i = 0; i <= partIndex; i++) {
    if (currentParts[i].kind === "text") {
      textToSpeak = textToSpeak + currentParts[i].vd + ". ";}}
  speakText(textToSpeak);}
document.getElementById("nextBtn").addEventListener("click", goNext);
document.getElementById("prevBtn").addEventListener("click", goPrev);
document.getElementById("speakBtn").addEventListener("click", playAudio);
loadSlides();
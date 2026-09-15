let slides = [];
let currentIndex = 0;
function loadSlides() {
  fetch("http://localhost:3000/api/slides")
    .then(function (response) {
      return response.json(); })

    .then(function (data) {
      slides = data;
      showSlide(); })

    .catch(function (error) {
      console.log("Error loading slides:", error);
      alert("Could not load slides from the server. Is the backend running?");});}

function showSlide() {
  const slide = slides[currentIndex];
  const box = document.getElementById("slideBox");

  if (slide.type === "vq") {
    let contentHTML = "";
    if (slide.title) {
      contentHTML = contentHTML + "<h2>" + slide.title + "</h2>";}
    for (let i = 0; i < slide.rows.length; i++) {
      const row = slide.rows[i];
      const uniqueId = currentIndex + "_" + i;
      contentHTML = contentHTML + "<div class='rowBlock'>";
    if (row.wd !== "") {
        contentHTML = contentHTML + "<p>" + row.wd + "</p>"; }
      contentHTML = contentHTML + "<p>" + row.vd + "</p>";
      if (row.multimedia !== "") {
        contentHTML = contentHTML + "<img src='" + row.multimedia + "'>"; }
      if (row.studyMaterials !== "") {
        contentHTML = contentHTML + "<p class='studyMaterials'>Study materials: " + row.studyMaterials + "</p>";}
      if (row.isQuestion === true) {
      contentHTML = contentHTML + "<input type='text' class='vqInputBox' id='vqInput_" + uniqueId + "' placeholder='Type your answer'>";
      contentHTML = contentHTML + "<button class='vqSubmitBtn' id='vqSubmitBtn_" + uniqueId + "'>Submit</button>"; 
      contentHTML = contentHTML + "<p class='vqResponseText' id='vqResponse_" + uniqueId + "'></p>"; }
      contentHTML = contentHTML + "<p class='timeText'>Time: " + row.time + " min</p>";
      contentHTML = contentHTML + "</div>";  }
    box.innerHTML = contentHTML;

    for (let i = 0; i < slide.rows.length; i++) {
      const row = slide.rows[i];
      if (row.isQuestion === true) {
        const uniqueId = currentIndex + "_" + i;
        const submitButton = document.getElementById("vqSubmitBtn_" + uniqueId);
        submitButton.addEventListener("click", function () {
          checkAnswer(uniqueId, row.answer);   }); } }

  } else {

    let contentHTML = "";
    contentHTML = contentHTML + "<h2>" + slide.title + "</h2>";
    if (slide.image !== "") {
      contentHTML = contentHTML + "<img src='" + slide.image + "'>";  }
    contentHTML = contentHTML + "<p>" + slide.text + "</p>";
    contentHTML = contentHTML + "<p class='timeText'>Time: " + slide.time + " min</p>";
    box.innerHTML = contentHTML;}

  playAudio();}

function checkAnswer(uniqueId, correctAnswer) {
  const inputBox = document.getElementById("vqInput_" + uniqueId);
  const responseText = document.getElementById("vqResponse_" + uniqueId);
  const studentAnswer = inputBox.value;

  if (studentAnswer === "") {
    alert("Please type an answer first.");
    return; }

  if (studentAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
    responseText.textContent = "Correct!";
    responseText.style.color = "green";
  } else {
    responseText.textContent = "Wrong. Correct answer: " + correctAnswer;
    responseText.style.color = "red"; }}
function goNext() {
  const lastIndex = slides.length - 1;

  if (currentIndex < lastIndex) {
    currentIndex = currentIndex + 1;
    showSlide();}}
function goPrev() {
  if (currentIndex > 0) {
    currentIndex = currentIndex - 1;
    showSlide();}}
function playAudio() {
  const slide = slides[currentIndex];
  let textToSpeak = "";

  if (slide.type === "vq") {
    for (let i = 0; i < slide.rows.length; i++) {
      textToSpeak = textToSpeak + slide.rows[i].vd + ". "; }
  } else {
    textToSpeak = slide.vd;}
  speechSynthesis.cancel();
  const speech = new SpeechSynthesisUtterance(textToSpeak);
  speechSynthesis.speak(speech);}
  
document.getElementById("nextBtn").addEventListener("click", goNext);
document.getElementById("prevBtn").addEventListener("click", goPrev);
document.getElementById("speakBtn").addEventListener("click", playAudio);
loadSlides();
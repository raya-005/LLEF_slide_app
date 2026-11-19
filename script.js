let slides = [];
let currentIndex = 0;
let currentParts = [];
let partIndex = -1;
const SHOW_ONLY_CURRENT_ROW = true;
function escapeHtml(text) {
  if (text === undefined || text === null) {
    return "";
  }

  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function normalizeAnswer(text) {
  return String(text || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
function splitAnswers(correctAnswer) {
  return String(correctAnswer || "")
    .split("|")
    .map(normalizeAnswer)
    .filter(function (a) {
      return a !== "";});
}
function formatCorrectAnswers(correctAnswer) {
  return String(correctAnswer || "")
    .split("|")
    .map(function (a) {
      return a.trim();})
    .filter(function (a) {
      return a !== "";})
    .join(" / ");
}
function loadSlides() {
  document.getElementById("progressText").textContent = "Loading...";
  document.getElementById("slideBox").innerHTML =
    "<div class='slideHeader'></div>" +
    "<div class='slideBody'><p>Loading slides... The server may take up to a minute to wake up.</p></div>" +
    "<div class='slideFooter'></div>";

  fetch("https://llef-slide-app.onrender.com/api/slides")
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      slides = data;
      showSlide();
    })
    .catch(function (error) {
      console.log("Error loading slides:", error);
      document.getElementById("progressText").textContent = "Error";
      document.getElementById("slideBox").innerHTML =
        "<div class='slideHeader'></div>" +
        "<div class='slideBody'><p>Could not load slides from the server. Please refresh the page and try again.</p></div>" +
        "<div class='slideFooter'></div>";
    });
}

function getHeaderTitle(slide) {
  if (slide.title) {
    return slide.title;
  }

  if (slide.type === "vq") {
    for (let i = 0; i < slide.rows.length; i++) {
      if (slide.rows[i].wd) {
        return slide.rows[i].wd;
      }
    }
  }

  return "";
}
function getSlideImages(slide) {
  if (Array.isArray(slide.images) && slide.images.length > 0) {
    return slide.images;
  }
  return slide.image ? [slide.image] : [];
}
function getRowImages(row) {
  if (Array.isArray(row.images) && row.images.length > 0) {
    return row.images;
  }
  return row.multimedia ? [row.multimedia] : [];
}
// ভিডিওর লিংক বুঝে নেওয়া: YouTube হলে ভেতরে চলে (embed), সরাসরি .mp4/.webm ফাইল হলে video player,
// অন্য যেকোনো লিংক (যেমন YouTube clip) নতুন tab-এ খোলার বাটন হয়ে দেখায়
function getVideoInfo(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    return { type: "none" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { type: "none" };
  }

  const host = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "");
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  let id = "";

  if (host === "youtu.be" && pathParts.length > 0) {
    id = pathParts[0];
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (pathParts[0] === "watch") {
      id = parsed.searchParams.get("v") || "";
    } else if (pathParts[0] === "embed" || pathParts[0] === "shorts" || pathParts[0] === "live") {
      id = pathParts[1] || "";
    }
  }

  if (/^[A-Za-z0-9_-]{6,20}$/.test(id)) {
    return { type: "youtube", id: id };
  }
  if (/\.(mp4|webm|ogg)$/i.test(parsed.pathname)) {
    return { type: "file", url: parsed.href };
  }
  return { type: "link", url: parsed.href };
}
function buildVideoHTML(url) {
  const info = getVideoInfo(url);

  if (info.type === "youtube") {
    return "<iframe src='https://www.youtube-nocookie.com/embed/" + escapeHtml(info.id) +
      "' style='width:100%; max-width:560px; aspect-ratio:16/9; border:0;' allowfullscreen></iframe>";
  }
  if (info.type === "file") {
    return "<video src='" + escapeHtml(info.url) + "' controls style='max-width:100%; max-height:360px;'></video>";
  }
  if (info.type === "link") {
    return "<a href='" + escapeHtml(info.url) + "' target='_blank' rel='noopener noreferrer'>Open the video</a>";
  }
  return "<p>(the video link is not valid)</p>";
}
function buildPartsForSlide(slide) {
  const parts = [];

  if (slide.type === "vq") {
    for (let i = 0; i < slide.rows.length; i++) {
      const row = slide.rows[i];
      const hasText = Boolean(row.vd) || Boolean(row.studyMaterials) || row.isQuestion === true;

      if (hasText) {
        parts.push({
          kind: "text",
          startsRow: true,
          vd: row.vd || "",
          simpleText: "",
          studyMaterials: row.studyMaterials,
          time: Number(row.time),
          isQuestion: row.isQuestion,
          answer: row.answer
        });
      }

      const rowImages = getRowImages(row);
      if (rowImages.length > 0) {
        parts.push({
          kind: "media",
          startsRow: !hasText,
          images: rowImages,
          time: hasText ? 0 : Number(row.time)
        });
      }

      if (row.video) {
        parts.push({
          kind: "video",
          startsRow: !hasText && rowImages.length === 0,
          video: row.video,
          time: (hasText || rowImages.length > 0) ? 0 : Number(row.time)
        });
      }
    }
  } else {
    const hasText = Boolean(slide.text) || Boolean(slide.vd);

    if (hasText) {
      parts.push({
        kind: "text",
        startsRow: true,
        vd: slide.vd || "",
        simpleText: slide.text || "",
        studyMaterials: "",
        time: Number(slide.time),
        isQuestion: false,
        answer: ""});}

    const slideImages = getSlideImages(slide);
    if (slideImages.length > 0) {
      parts.push({
        kind: "media",
        startsRow: !hasText,
        images: slideImages,
        time: hasText ? 0 : Number(slide.time)});}

    if (slide.video) {
      parts.push({
        kind: "video",
        startsRow: !hasText && slideImages.length === 0,
        video: slide.video,
        time: (hasText || slideImages.length > 0) ? 0 : Number(slide.time)});}}

  return parts;}
function getSpokenText(part) {
  return part.vd || part.simpleText || "";
}

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
    return;
  }

  partIndex = partIndex + 1;

  const part = currentParts[partIndex];
  const uniqueId = currentIndex + "_" + partIndex;
  const bodyContent = document.getElementById("slideBodyContent");
  if (partIndex === 0 || (SHOW_ONLY_CURRENT_ROW && part.startsRow)) {
    bodyContent.innerHTML = "";
  }

  let partHTML = "<div class='rowBlock'>";

  if (part.kind === "text") {
    if (part.simpleText) {
      partHTML = partHTML + "<p class='partText'>" + escapeHtml(part.simpleText) + "</p>";}
    if (part.vd && part.vd !== part.simpleText) {
      partHTML = partHTML + "<p class='partText'>" + escapeHtml(part.vd) + "</p>";
    }

    if (part.studyMaterials) {
      partHTML = partHTML + "<p class='studyMaterials'>Study materials: " + escapeHtml(part.studyMaterials) + "</p>";}

    if (part.isQuestion === true) {
      partHTML = partHTML + "<input type='text' class='vqInputBox' id='vqInput_" + uniqueId + "' placeholder='Type your answer'>";
      partHTML = partHTML + "<button class='vqSubmitBtn' id='vqSubmitBtn_" + uniqueId + "'>Submit</button>";
      partHTML = partHTML + "<p class='vqResponseText' id='vqResponse_" + uniqueId + "'></p>";}}

  if (part.kind === "media") {
    partHTML = partHTML + "<div style='display:flex; flex-wrap:wrap; gap:10px; justify-content:center;'>";
    for (let k = 0; k < part.images.length; k++) {
      partHTML = partHTML + "<img src='" + escapeHtml(part.images[k]) + "' style='max-height:320px; max-width:100%; object-fit:contain;'>";
    }
    partHTML = partHTML + "</div>";
  }

  if (part.kind === "video") {
    partHTML = partHTML + buildVideoHTML(part.video);
  }

  partHTML = partHTML + "</div>";
  bodyContent.insertAdjacentHTML("beforeend", partHTML);
  const newBlock = bodyContent.lastElementChild;

  if (part.kind === "text") {
    const spoken = getSpokenText(part);
    const textElements = newBlock.querySelectorAll(".partText");

    for (let i = 0; i < textElements.length; i++) {
      textElements[i].addEventListener("click", function (event) {
        event.stopPropagation();
        speakText(spoken);});}

    if (spoken !== "") {
      speakText(spoken);}}

  if (part.kind === "text" && part.isQuestion === true) {
    const submitButton = document.getElementById("vqSubmitBtn_" + uniqueId);

    submitButton.addEventListener("click", function (event) {
      event.stopPropagation();
      checkAnswer(uniqueId, part.answer);});

    const inputBox = document.getElementById("vqInput_" + uniqueId);
    inputBox.addEventListener("click", function (event) {
      event.stopPropagation();});}
  let totalTime = 0;

  for (let i = 0; i <= partIndex; i++) {
    totalTime = totalTime + currentParts[i].time;
  }
  totalTime = Math.round(totalTime * 100) / 100;

  let footerText = "Time: " + totalTime + " min";

  if (partIndex < currentParts.length - 1) {
    footerText = footerText + "  •  Click for more";
  }

  document.getElementById("slideFooterContent").textContent = footerText;
}
function checkAnswer(uniqueId, correctAnswer) {
  const inputBox = document.getElementById("vqInput_" + uniqueId);
  const responseText = document.getElementById("vqResponse_" + uniqueId);
  const studentAnswer = inputBox.value.trim();
  const cleanCorrectAnswer = String(correctAnswer || "").trim();

  if (studentAnswer === "") {
    alert("Please type an answer first.");
    return;
  }

  let isCorrect;

  if (splitAnswers(cleanCorrectAnswer).includes(normalizeAnswer(studentAnswer))) {
    responseText.textContent = "Correct!";
    responseText.style.color = "green";
    isCorrect = true;
  } else {
    responseText.textContent = "Wrong. Correct answer: " + formatCorrectAnswers(cleanCorrectAnswer);
    responseText.style.color = "red";
    isCorrect = false;
  }

  saveAnswerToBackend(uniqueId, studentAnswer, cleanCorrectAnswer, isCorrect);
}
function saveAnswerToBackend(uniqueId, studentAnswer, correctAnswer, isCorrect) {
  const currentSlide = slides[currentIndex];

  fetch("https://llef-slide-app.onrender.com/api/answers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      slideId: currentSlide ? currentSlide._id : "",
      questionId: uniqueId,
      studentAnswer: studentAnswer,
      correctAnswer: correctAnswer,
      isCorrect: isCorrect})})
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      console.log("Answer saved:", data);
    })
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
      const spoken = getSpokenText(currentParts[i]);
      if (spoken !== "") {
        textToSpeak = textToSpeak + spoken + ". ";}}}

  if (textToSpeak !== "") {
    speakText(textToSpeak);}}

document.getElementById("nextBtn").addEventListener("click", goNext);
document.getElementById("prevBtn").addEventListener("click", goPrev);
document.getElementById("speakBtn").addEventListener("click", playAudio);
loadSlides();
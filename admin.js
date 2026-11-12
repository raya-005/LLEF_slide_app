const API_URL = "https://llef-slide-app.onrender.com";

// ============================
// কোন slide edit করা হচ্ছে, তার id
// null মানে এখন নতুন slide বানানো হচ্ছে
// ============================
let editingId = null;

// simple slide-এর ছবি বাছাইয়ের অংশ এই variable-এ থাকে
let simplePicker = null;

// সব slide এখানে জমা থাকে, যাতে উত্তরের তালিকায় slide-এর নাম দেখানো যায়
let allSlides = [];

// নতুন: সব উত্তর এখানে জমা থাকে, যাতে CSV বানানোর সময় আবার server-কে জিজ্ঞেস করতে না হয়
let allAnswers = [];

function showMessage(text, color) {
  const messageBox = document.getElementById("message");
  messageBox.textContent = text;
  messageBox.style.color = color;
}

// ============================
// ছবির ফাইল পড়ে ছোট আর হালকা করা
// সবচেয়ে লম্বা দিক ৮০০px-এর বেশি হবে না, আর JPEG হিসেবে জমা হবে
// শেষে ছবিটা লেখার আকারে (data URL) ফেরত দেয়
// ============================
function compressImage(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();

    reader.onload = function () {
      const img = new Image();

      img.onload = function () {
        const maxSize = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          const scale = maxSize / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");

        // স্বচ্ছ (transparent) ছবি JPEG-এ কালো হয়ে যায়, তাই আগে সাদা রং দেওয়া
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };

      img.onerror = function () {
        reject(new Error("Could not read this image."));
      };

      img.src = reader.result;
    };

    reader.onerror = function () {
      reject(new Error("Could not read this file."));
    };

    reader.readAsDataURL(file);
  });
}

// ============================
// একটা "ছবি বাছাই" অংশ বানানো (ফাইল বাছাই + ছোট preview + Remove বাটন)
// initialValue দিলে (edit-এর সময়) আগের ছবিটা আগে থেকেই দেখা যাবে
// ফেরত দেয়: { element: পর্দায় বসানোর অংশ, getValue: বর্তমান ছবির মান দেয় }
// ============================
function createImagePicker(initialValues) {
  const MAX_IMAGES = 6;
  let images = [];

  if (Array.isArray(initialValues)) {
    images = initialValues.filter(Boolean);
  } else if (initialValues) {
    images = [initialValues];
  }

  const wrapper = document.createElement("div");
  wrapper.className = "imagePicker";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.multiple = true;

  const hint = document.createElement("p");
  hint.className = "imageStatus";
  hint.textContent = "You can choose more than one image (up to " + MAX_IMAGES + "). Choose again to add more.";

  const status = document.createElement("p");
  status.className = "imageStatus";

  const previewBox = document.createElement("div");
  previewBox.style.display = "flex";
  previewBox.style.flexWrap = "wrap";
  previewBox.style.gap = "8px";

  wrapper.appendChild(fileInput);
  wrapper.appendChild(hint);
  wrapper.appendChild(status);
  wrapper.appendChild(previewBox);

  // ছবিগুলোর ছোট preview, প্রতিটার নিচে নম্বর আর Remove বাটন
  function refresh() {
    previewBox.innerHTML = "";

    for (let i = 0; i < images.length; i++) {
      const item = document.createElement("div");

      const img = document.createElement("img");
      img.src = images[i];
      img.alt = "Selected image " + (i + 1);

      img.addEventListener("error", function () {
        const note = document.createElement("p");
        note.className = "imageStatus";
        note.textContent = "(this image could not be shown, it may be a missing file)";
        img.replaceWith(note);
      });

      const label = document.createElement("p");
      label.className = "imageStatus";
      label.textContent = "Image " + (i + 1);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "danger";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", function () {
        images.splice(i, 1);
        status.textContent = "";
        refresh();
      });

      item.appendChild(img);
      item.appendChild(label);
      item.appendChild(removeBtn);
      previewBox.appendChild(item);
    }
  }

  fileInput.addEventListener("change", function () {
    const files = Array.from(fileInput.files);

    if (files.length === 0) {
      return;
    }

    for (let i = 0; i < files.length; i++) {
      if (!files[i].type.startsWith("image/")) {
        status.textContent = "Please choose image files only (jpg, png, webp).";
        fileInput.value = "";
        return;
      }
    }

    if (images.length + files.length > MAX_IMAGES) {
      status.textContent = "Too many images. The maximum is " + MAX_IMAGES + " per slide or row.";
      fileInput.value = "";
      return;
    }

    status.textContent = "Processing the images...";

    Promise.all(files.map(compressImage))
      .then(function (dataUrls) {
        images = images.concat(dataUrls);
        status.textContent = "";
        fileInput.value = "";
        refresh();
      })
      .catch(function (error) {
        status.textContent = error.message;
        fileInput.value = "";
      });
  });

  refresh();

  return {
    element: wrapper,
    getValue: function () {
      return images.slice();
    }
  };
}

// পুরোনো slide-এ একটাই ছবি (image / multimedia) থাকত; নতুনগুলোতে images তালিকা
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

// ============================
// simple slide-এর ছবি বাছাই অংশটা নতুন করে বসানো
// ============================
function mountSimplePicker(value) {
  const container = document.getElementById("s_imageBox");
  container.innerHTML = "";

  simplePicker = createImagePicker(value);
  container.appendChild(simplePicker.element);
}

// ============================
// Slide type বদলালে সঠিক fields দেখানো
// ============================
function toggleFields() {
  const type = document.getElementById("slideType").value;

  if (type === "simple") {
    document.getElementById("simpleFields").style.display = "block";
    document.getElementById("vqFields").style.display = "none";
  } else {
    document.getElementById("simpleFields").style.display = "none";
    document.getElementById("vqFields").style.display = "block";

    // কোনো row না থাকলে একটা খালি row নিজে থেকেই দেখানো
    if (document.getElementsByClassName("rowBox").length === 0) {
      addRow();
    }
  }
}

// ============================
// নতুন একটা row-এর form যোগ করা
// rowData দিলে (edit-এর সময়) ঘরগুলো সেই data দিয়ে আগে থেকে ভরা থাকবে
// ============================
function addRow(rowData) {
  const container = document.getElementById("rowsContainer");
  const rowNumber = container.children.length + 1;

  const box = document.createElement("div");
  box.className = "rowBox";
  box.innerHTML =
    "<h4>Row " + rowNumber + "</h4>" +
    "<label>WD (written description, optional)</label>" +
    "<input type='text' class='r_wd'>" +
    "<label>VD (read aloud and shown on the slide, optional)</label>" +
    "<textarea class='r_vd'></textarea>" +
    "<label>Image (optional)</label>" +
    "<div class='r_imageBox'></div>" +
    "<label>Study materials (optional)</label>" +
    "<input type='text' class='r_study'>" +
    "<label>Time (minutes, required)</label>" +
    "<input type='number' class='r_time' step='0.01' min='0'>" +
    "<div class='checkRow'><input type='checkbox' class='r_isQuestion'> This row is a question (the VD is the question text)</div>" +
    "<label>Correct answer (only if it is a question)</label>" +
    "<input type='text' class='r_answer'>" +
    "<button type='button' class='danger removeRowBtn'>Remove this row</button>";

  container.appendChild(box);

  // এই row-এর ছবি বাছাই অংশ বসানো, আর box-এর সাথে জুড়ে রাখা যাতে পরে মান পড়া যায়
  const picker = createImagePicker(rowData ? getRowImages(rowData) : []);
  box.querySelector(".r_imageBox").appendChild(picker.element);
  box.imagePicker = picker;

  // edit-এর সময় আগের data ঘরগুলোতে বসানো (.value দিয়ে, তাই লেখা কখনো HTML হিসেবে চলে না)
  if (rowData) {
    box.querySelector(".r_wd").value = rowData.wd || "";
    box.querySelector(".r_vd").value = rowData.vd || "";
    box.querySelector(".r_study").value = rowData.studyMaterials || "";
    box.querySelector(".r_time").value = rowData.time;
    box.querySelector(".r_isQuestion").checked = rowData.isQuestion === true;
    box.querySelector(".r_answer").value = rowData.answer || "";
  }

  box.querySelector(".removeRowBtn").addEventListener("click", function () {
    box.remove();
    renumberRows();
  });
}

function renumberRows() {
  const headings = document.querySelectorAll(".rowBox h4");
  for (let i = 0; i < headings.length; i++) {
    headings[i].textContent = "Row " + (i + 1);
  }
}

// ============================
// সব row-এর data জড়ো করা, সাথে সঠিক type-এ রূপান্তর (Number, Boolean, String)
// কোনো ভুল পেলে null ফেরত দেয়
// ============================
function collectRows() {
  const boxes = document.getElementsByClassName("rowBox");
  const rows = [];

  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];
    const vd = box.querySelector(".r_vd").value.trim();
    const images = box.imagePicker.getValue();
    const studyMaterials = box.querySelector(".r_study").value.trim();
    const timeText = box.querySelector(".r_time").value;
    const isQuestion = box.querySelector(".r_isQuestion").checked;
    const answer = box.querySelector(".r_answer").value.trim();

    // VD বাধ্যতামূলক নয়, তবে VD, ছবি, study materials - অন্তত একটা লাগবে
    if (vd === "" && images.length === 0 && studyMaterials === "") {
      showMessage("Row " + (i + 1) + ": add at least a VD, an image or study materials.", "red");
      return null;
    }
    if (timeText === "") {
      showMessage("Row " + (i + 1) + ": Time is required.", "red");
      return null;
    }
    // প্রশ্নের লেখাটাই VD, তাই প্রশ্নের row-তে VD লাগবে
    if (isQuestion && vd === "") {
      showMessage("Row " + (i + 1) + ": a question needs a VD (the question text).", "red");
      return null;
    }
    if (isQuestion && answer === "") {
      showMessage("Row " + (i + 1) + ": a question needs a correct answer.", "red");
      return null;
    }

    rows.push({
      wd: box.querySelector(".r_wd").value.trim(),
      vd: vd,
      images: images,
      studyMaterials: studyMaterials,
      time: Number(timeText),
      isQuestion: isQuestion,
      answer: answer
    });
  }

  return rows;
}

// ============================
// Slide save করা
// নতুন হলে POST, edit চলাকালীন হলে PUT (একই slide বদলায়)
// ============================
function saveSlide() {
  const type = document.getElementById("slideType").value;
  const title = document.getElementById("title").value.trim();
  let slideData;

  if (type === "simple") {
    const text = document.getElementById("s_text").value.trim();
    const vd = document.getElementById("s_vd").value.trim();
    const images = simplePicker.getValue();
    const timeText = document.getElementById("s_time").value;

    if (title === "") {
      showMessage("Title is required for a simple slide.", "red");
      return;
    }
    // VD বাধ্যতামূলক নয়, তবে text, VD, ছবি - অন্তত একটা লাগবে
    if (text === "" && vd === "" && images.length === 0) {
      showMessage("Add some text, a VD or an image.", "red");
      return;
    }
    if (timeText === "") {
      showMessage("Time is required.", "red");
      return;
    }

    slideData = {
      type: "simple",
      title: title,
      text: text,
      vd: vd,
      images: images,
      time: Number(timeText)
    };
  } else {
    const rows = collectRows();

    if (rows === null) {
      return;
    }
    if (rows.length === 0) {
      showMessage("Add at least one row.", "red");
      return;
    }

    slideData = {
      type: "vq",
      title: title,
      rows: rows
    };
  }

  const isEditing = editingId !== null;
  const url = isEditing ? API_URL + "/api/slides/" + editingId : API_URL + "/api/slides";
  const method = isEditing ? "PUT" : "POST";

  // সার্ভার ঘুম থেকে জাগতে সময় নিলে দুইবার চাপা আটকাতে বাটন বন্ধ রাখা
  const saveBtn = document.getElementById("saveBtn");
  saveBtn.disabled = true;

  showMessage("Saving... (the server may take up to a minute to wake up)", "#555");

  fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(slideData)
  })
    .then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) {
          throw new Error(data.message || "Could not save the slide");
        }
        return data;
      });
    })
    .then(function () {
      if (isEditing) {
        exitEditMode();
        showMessage("Slide updated!", "green");
      } else {
        clearForm();
        showMessage("Slide saved!", "green");
      }
      loadSlideList();
    })
    .catch(function (error) {
      showMessage("Error: " + error.message, "red");
    })
    .finally(function () {
      saveBtn.disabled = false;
    });
}

// ============================
// ফর্মের সব ঘর খালি করা (কোনো row যোগ না করে)
// ============================
function resetFields() {
  document.getElementById("title").value = "";
  document.getElementById("s_text").value = "";
  document.getElementById("s_vd").value = "";
  document.getElementById("s_time").value = "";
  document.getElementById("rowsContainer").innerHTML = "";
  mountSimplePicker("");
}

function clearForm() {
  resetFields();

  if (document.getElementById("slideType").value === "vq") {
    addRow();
  }
}

// ============================
// কোনো slide-এর Edit বাটন চাপলে ফর্মে তার data ভরে দেওয়া
// ============================
function startEdit(slide) {
  editingId = slide._id;

  const type = slide.type === "vq" ? "vq" : "simple";

  resetFields();
  document.getElementById("slideType").value = type;
  toggleFields();

  document.getElementById("title").value = slide.title || "";

  if (type === "simple") {
    document.getElementById("s_text").value = slide.text || "";
    document.getElementById("s_vd").value = slide.vd || "";
    document.getElementById("s_time").value = slide.time;
    mountSimplePicker(getSlideImages(slide));
  } else {
    // toggleFields যে খালি row যোগ করেছে সেটা মুছে, আসল row-গুলো ভরা অবস্থায় বসানো
    document.getElementById("rowsContainer").innerHTML = "";
    for (let i = 0; i < slide.rows.length; i++) {
      addRow(slide.rows[i]);
    }
  }

  const banner = document.getElementById("editBanner");
  banner.textContent = "Editing: " + getSlideLabel(slide);
  banner.style.display = "block";

  document.getElementById("saveBtn").textContent = "Update slide";
  document.getElementById("cancelEditBtn").style.display = "inline-block";

  showMessage("", "");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============================
// Edit অবস্থা থেকে বের হয়ে আবার নতুন slide বানানোর অবস্থায় ফেরা
// ============================
function exitEditMode() {
  editingId = null;

  document.getElementById("editBanner").style.display = "none";
  document.getElementById("saveBtn").textContent = "Save slide";
  document.getElementById("cancelEditBtn").style.display = "none";

  clearForm();
}

function cancelEdit() {
  exitEditMode();
  showMessage("Edit cancelled.", "#555");
}

// ============================
// Slide-এর তালিকায় আর preview-র header-এ দেখানোর নাম বের করা
// (index.html-এর getHeaderTitle-এর মতোই)
// ============================
function getSlideLabel(slide) {
  if (slide.title) {
    return slide.title;
  }

  if (slide.rows && slide.rows.length > 0) {
    for (let i = 0; i < slide.rows.length; i++) {
      if (slide.rows[i].wd) {
        return slide.rows[i].wd;
      }
    }
  }

  return "(untitled)";
}

// ============================
// একটা <p> বানিয়ে parent-এ যোগ করা
// textContent ব্যবহার করা হয়েছে, তাই slide-এর লেখা কখনো HTML হিসেবে চলবে না
// ============================
function addPreviewParagraph(parent, text, className) {
  const p = document.createElement("p");
  p.textContent = text;
  if (className) {
    p.className = className;
  }
  parent.appendChild(p);
}

// ============================
// ছবি দেখানো; ছবি না পেলে একটা ছোট নোট দেখানো
// (ছবির মান অনেক লম্বা লেখা হতে পারে, তাই সেটা নোটে ছাপানো হয় না)
// ============================
function addPreviewImage(parent, imageValue) {
  const img = document.createElement("img");
  img.className = "previewImg";
  img.src = imageValue;
  img.alt = "Slide image";

  img.addEventListener("error", function () {
    const note = document.createElement("p");
    note.className = "previewHint";
    note.textContent = "(image could not be loaded)";
    img.replaceWith(note);
  });

  parent.appendChild(img);
}

// ============================
// তালিকার কোনো slide-এ click করলে আসল slide-এর মতো চেহারায় preview দেখানো:
// header (title) + body (content) + footer (মোট time)
// ============================
function showPreview(slide, itemElement) {
  const box = document.getElementById("slidePreview");
  box.innerHTML = "";

  // বর্তমান বাছাই করা slide-টাকে তালিকায় হাইলাইট করা
  const allItems = document.getElementsByClassName("slideItem");
  for (let i = 0; i < allItems.length; i++) {
    allItems[i].classList.remove("selected");
  }
  itemElement.classList.add("selected");

  const card = document.createElement("div");
  card.className = "previewSlide";

  // ---------- header ----------
  const header = document.createElement("div");
  header.className = "slideHeader";
  header.textContent = getSlideLabel(slide);
  card.appendChild(header);

  // ---------- body ----------
  const body = document.createElement("div");
  body.className = "slideBody";

  let totalTime = 0;

  if (slide.type === "vq") {
    for (let i = 0; i < slide.rows.length; i++) {
      const row = slide.rows[i];

      const rowBlock = document.createElement("div");
      rowBlock.className = "rowBlock";

      // VD খালি থাকলে কিছু দেখানো হয় না
      if (row.vd) {
        addPreviewParagraph(rowBlock, row.vd);
      }

      const rowImgs = getRowImages(row);
      for (let k = 0; k < rowImgs.length; k++) {
        addPreviewImage(rowBlock, rowImgs[k]);
      }

      if (row.studyMaterials) {
        addPreviewParagraph(rowBlock, "Study materials: " + row.studyMaterials, "studyMaterials");
      }

      if (row.isQuestion) {
        // ছাত্র যেভাবে দেখবে সেভাবে, কিন্তু বাটন/ঘর বন্ধ (disabled)
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = "Type your answer";
        input.disabled = true;

        const submit = document.createElement("button");
        submit.type = "button";
        submit.textContent = "Submit";
        submit.disabled = true;

        rowBlock.appendChild(input);
        rowBlock.appendChild(submit);

        // শুধু admin-এর জন্য নোট, ছাত্র এটা দেখবে না
        addPreviewParagraph(rowBlock, "Admin note: correct answer is \"" + row.answer + "\"", "adminNote");
      }

      body.appendChild(rowBlock);
      totalTime = totalTime + Number(row.time);
    }
  } else {
    // আসল slide-এর মতোই Text দেখানো, তার নিচে VD (দুটো একই হলে একবারই)
    if (slide.text) {
      addPreviewParagraph(body, slide.text);
    }

    if (slide.vd && slide.vd !== slide.text) {
      addPreviewParagraph(body, slide.vd);
    }

    const slideImgs = getSlideImages(slide);
    for (let k = 0; k < slideImgs.length; k++) {
      addPreviewImage(body, slideImgs[k]);
    }

    totalTime = Number(slide.time);
  }

  card.appendChild(body);

  // ---------- footer ----------
  // 0.5 + 0.5 + 0.01 এর মতো যোগে ভাসমান সংখ্যার গোলমাল এড়াতে round করা
  const roundedTime = Math.round(totalTime * 100) / 100;

  const footer = document.createElement("div");
  footer.className = "slideFooter";
  footer.textContent = "Time: " + roundedTime + " min";
  card.appendChild(footer);

  box.appendChild(card);
}

function clearPreview() {
  document.getElementById("slidePreview").innerHTML =
    "<span class='previewHint'>No slide selected yet.</span>";
}

// ============================
// উত্তরের slideId দেখে slide-এর নাম বের করা
// ============================
function findSlideLabelById(slideId) {
  if (!slideId) {
    return "-";
  }

  for (let i = 0; i < allSlides.length; i++) {
    if (allSlides[i]._id === slideId) {
      return getSlideLabel(allSlides[i]);
    }
  }

  // slide পরে মুছে ফেলা হয়েছে
  return "(deleted slide)";
}

// ============================
// একটা ঘর (<td>) বানিয়ে row-তে যোগ করা
// textContent ব্যবহার করা হয়েছে, তাই ছাত্রের লেখা কখনো HTML হিসেবে চলবে না
// ============================
function addAnswerCell(row, text, className) {
  const cell = document.createElement("td");
  cell.textContent = text;

  if (className) {
    cell.className = className;
  }

  row.appendChild(cell);
}

// ============================
// ছাত্রদের সব উত্তর server থেকে এনে টেবিলে দেখানো (নতুনগুলো আগে)
// ============================
function loadAnswers() {
  const box = document.getElementById("answersBox");
  const summary = document.getElementById("answersSummary");

  fetch(API_URL + "/api/answers")
    .then(function (response) {
      return response.json();
    })
    .then(function (answers) {
      box.innerHTML = "";

      if (!Array.isArray(answers)) {
        throw new Error("Unexpected reply from the server");
      }

      // নতুন: CSV-র জন্য উত্তরগুলো মনে রাখা
      allAnswers = answers;

      if (answers.length === 0) {
        summary.textContent = "";
        box.textContent = "No answers yet.";
        return;
      }

      let correctCount = 0;

      for (let i = 0; i < answers.length; i++) {
        if (answers[i].isCorrect === true) {
          correctCount = correctCount + 1;
        }
      }

      summary.textContent =
        "Total answers: " + answers.length + "  •  Correct: " + correctCount +
        "  •  Wrong: " + (answers.length - correctCount);

      const table = document.createElement("table");
      table.className = "answersTable";

      const headRow = document.createElement("tr");
      const headings = ["Time", "Slide", "Student's answer", "Correct answer", "Result"];

      for (let i = 0; i < headings.length; i++) {
        const th = document.createElement("th");
        th.textContent = headings[i];
        headRow.appendChild(th);
      }

      const thead = document.createElement("thead");
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");

      for (let i = 0; i < answers.length; i++) {
        const answer = answers[i];
        const row = document.createElement("tr");

        let timeText = "-";
        const date = new Date(answer.createdAt);

        if (!Number.isNaN(date.getTime())) {
          timeText = date.toLocaleString();
        }

        addAnswerCell(row, timeText);
        addAnswerCell(row, findSlideLabelById(answer.slideId));
        addAnswerCell(row, answer.studentAnswer);
        addAnswerCell(row, answer.correctAnswer);

        if (answer.isCorrect === true) {
          addAnswerCell(row, "Correct", "answerCorrect");
        } else {
          addAnswerCell(row, "Wrong", "answerWrong");
        }

        tbody.appendChild(row);
      }

      table.appendChild(tbody);
      box.appendChild(table);
    })
    .catch(function () {
      summary.textContent = "";
      box.textContent = "Could not load the answers. Is the backend running?";
    });
}

// ============================
// নতুন: CSV-র একটা ঘরের লেখাকে নিরাপদ করা
// ১) কমা, উদ্ধৃতি চিহ্ন বা নতুন লাইন থাকলে ঘরটা " " দিয়ে ঘিরে দেওয়া (ভেতরের " হয় "")
// ২) = + - @ দিয়ে শুরু হলে সামনে ' বসানো, যাতে Excel লেখাটাকে সূত্র (formula) হিসেবে না চালায়
//    (ছাত্র ইচ্ছে করে এমন লেখা দিলে ফাইল খুলে ক্ষতি হতে পারত)
// ============================
function csvCell(value) {
  let text = String(value === undefined || value === null ? "" : value);

  if (/^[=+\-@\t\r]/.test(text)) {
    text = "'" + text;
  }

  if (/[",\r\n]/.test(text)) {
    text = "\"" + text.replace(/"/g, "\"\"") + "\"";
  }

  return text;
}

// ============================
// নতুন: সব উত্তর CSV ফাইল বানিয়ে download করানো
// কলাম: Time, Slide, Student's answer, Correct answer, Result
// ============================
function downloadAnswersCsv() {
  if (allAnswers.length === 0) {
    alert("There are no answers to download yet.");
    return;
  }

  const lines = [];

  lines.push(["Time", "Slide", "Student's answer", "Correct answer", "Result"].map(csvCell).join(","));

  for (let i = 0; i < allAnswers.length; i++) {
    const answer = allAnswers[i];

    let timeText = "";
    const date = new Date(answer.createdAt);

    if (!Number.isNaN(date.getTime())) {
      timeText = date.toLocaleString();
    }

    const cells = [
      timeText,
      findSlideLabelById(answer.slideId),
      answer.studentAnswer,
      answer.correctAnswer,
      answer.isCorrect === true ? "Correct" : "Wrong"
    ];

    lines.push(cells.map(csvCell).join(","));
  }

  // শুরুর \uFEFF থাকলে Excel বাংলা বা অন্য ভাষার লেখা ঠিকভাবে পড়ে
  const csvText = "\uFEFF" + lines.join("\r\n");

  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  // ফাইলের নামে আজকের তারিখ, যেমন student-answers-2026-11-05.csv
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const fileName = "student-answers-" + today.getFullYear() + "-" + month + "-" + day + ".csv";

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// ============================
// এখন পর্যন্ত থাকা সব slide দেখানো
// নামে click করলে preview, সাথে Edit আর Delete বাটন
// ============================
function loadSlideList() {
  const listBox = document.getElementById("slideList");

  fetch(API_URL + "/api/slides")
    .then(function (response) {
      return response.json();
    })
    .then(function (slides) {
      listBox.innerHTML = "";
      clearPreview();

      // slide-এর তালিকা মনে রাখা, তারপর উত্তরের তালিকা (slide-এর নামসহ) নতুন করে আনা
      allSlides = slides;
      loadAnswers();

      if (slides.length === 0) {
        listBox.textContent = "No slides yet.";
        return;
      }

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];

        const item = document.createElement("div");
        item.className = "slideItem";

        const label = document.createElement("span");
        label.className = "slideName";
        label.textContent = (i + 1) + ". " + getSlideLabel(slide) + "  (" + (slide.type || "simple") + ")";
        label.addEventListener("click", function () {
          showPreview(slide, item);
        });

        const editBtn = document.createElement("button");
        editBtn.className = "secondary small";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", function () {
          startEdit(slide);
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "danger";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", function () {
          deleteSlide(slide._id, getSlideLabel(slide));
        });

        const actions = document.createElement("div");
        actions.className = "slideActions";
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        item.appendChild(label);
        item.appendChild(actions);
        listBox.appendChild(item);
      }
    })
    .catch(function () {
      listBox.textContent = "Could not load slides. Is the backend running?";
    });
}

// ============================
// slide মুছে ফেলা
// ব্যর্থ হলে আসল কারণ (server-এর বার্তা বা status) পর্দায় দেখায়
// ============================
function deleteSlide(id, name) {
  const sure = confirm("Delete the slide \"" + name + "\"?");
  if (!sure) {
    return;
  }

  showMessage("Deleting... (the server may take up to a minute to wake up)", "#555");

  fetch(API_URL + "/api/slides/" + id, {
    method: "DELETE"
  })
    .then(function (response) {
      // উত্তর আগে লেখা হিসেবে নেওয়া, তারপর JSON কিনা দেখা
      return response.text().then(function (text) {
        let data = null;

        try {
          data = JSON.parse(text);
        } catch (e) {
          data = null;
        }

        if (!response.ok) {
          const reason = data && data.message
            ? data.message
            : "the server answered with status " + response.status;
          throw new Error(reason);
        }

        if (data === null) {
          throw new Error("the server sent an unexpected reply (status " + response.status + "). It may still be starting up, please wait a minute and try again");
        }

        return data;
      });
    })
    .then(function () {
      // যে slide edit করছিলাম সেটাই মুছে গেলে edit অবস্থা বন্ধ করা
      if (id === editingId) {
        exitEditMode();
      }
      showMessage("Slide deleted.", "green");
      loadSlideList();
    })
    .catch(function (error) {
      console.log("Delete error:", error);
      showMessage("Could not delete the slide: " + error.message, "red");
    });
}

document.getElementById("slideType").addEventListener("change", toggleFields);

// addRow সরাসরি দিলে click event-টা rowData হিসেবে ঢুকে যেত, তাই ফাঁকা function দিয়ে ডাকা
document.getElementById("addRowBtn").addEventListener("click", function () {
  addRow();
});

document.getElementById("saveBtn").addEventListener("click", saveSlide);
document.getElementById("cancelEditBtn").addEventListener("click", cancelEdit);

// উত্তরের তালিকা নতুন করে আনার বাটন
document.getElementById("refreshAnswersBtn").addEventListener("click", loadAnswers);

// নতুন: CSV download বাটন
document.getElementById("downloadCsvBtn").addEventListener("click", downloadAnswersCsv);

// পাতা খোলার সময় simple slide-এর ছবি বাছাই অংশ বসানো
mountSimplePicker("");
toggleFields();
loadSlideList();
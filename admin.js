const API_URL = "https://llef-slide-app.onrender.com";

function showMessage(text, color) {
  const messageBox = document.getElementById("message");
  messageBox.textContent = text;
  messageBox.style.color = color;
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

    // প্রথমবার vq বেছে নিলে একটা খালি row নিজে থেকেই দেখানো
    if (document.getElementsByClassName("rowBox").length === 0) {
      addRow();
    }
  }
}

// ============================
// নতুন একটা row-এর form যোগ করা
// ============================
function addRow() {
  const container = document.getElementById("rowsContainer");
  const rowNumber = container.children.length + 1;

  const box = document.createElement("div");
  box.className = "rowBox";
  box.innerHTML =
    "<h4>Row " + rowNumber + "</h4>" +
    "<label>WD (written description, optional)</label>" +
    "<input type='text' class='r_wd'>" +
    "<label>VD (spoken text, required)</label>" +
    "<textarea class='r_vd'></textarea>" +
    "<label>Multimedia file name (optional, e.g. circuit.jpg)</label>" +
    "<input type='text' class='r_multimedia'>" +
    "<label>Study materials (optional)</label>" +
    "<input type='text' class='r_study'>" +
    "<label>Time (minutes, required)</label>" +
    "<input type='number' class='r_time' step='0.01' min='0'>" +
    "<div class='checkRow'><input type='checkbox' class='r_isQuestion'> This row is a question</div>" +
    "<label>Correct answer (only if it is a question)</label>" +
    "<input type='text' class='r_answer'>" +
    "<button type='button' class='danger removeRowBtn'>Remove this row</button>";

  container.appendChild(box);

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
    const timeText = box.querySelector(".r_time").value;
    const isQuestion = box.querySelector(".r_isQuestion").checked;
    const answer = box.querySelector(".r_answer").value.trim();

    if (vd === "") {
      showMessage("Row " + (i + 1) + ": VD is required.", "red");
      return null;
    }
    if (timeText === "") {
      showMessage("Row " + (i + 1) + ": Time is required.", "red");
      return null;
    }
    if (isQuestion && answer === "") {
      showMessage("Row " + (i + 1) + ": a question needs a correct answer.", "red");
      return null;
    }

    rows.push({
      wd: box.querySelector(".r_wd").value.trim(),
      vd: vd,
      multimedia: box.querySelector(".r_multimedia").value.trim(),
      studyMaterials: box.querySelector(".r_study").value.trim(),
      time: Number(timeText),
      isQuestion: isQuestion,
      answer: answer
    });
  }

  return rows;
}

// ============================
// Slide save করা (backend-এ POST পাঠানো)
// ============================
function saveSlide() {
  const type = document.getElementById("slideType").value;
  const title = document.getElementById("title").value.trim();
  let slideData;

  if (type === "simple") {
    const text = document.getElementById("s_text").value.trim();
    const vd = document.getElementById("s_vd").value.trim();
    const image = document.getElementById("s_image").value.trim();
    const timeText = document.getElementById("s_time").value;

    if (title === "") {
      showMessage("Title is required for a simple slide.", "red");
      return;
    }
    if (vd === "") {
      showMessage("VD is required.", "red");
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
      image: image,
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

  showMessage("Saving... (the server may take up to a minute to wake up)", "#555");

  fetch(API_URL + "/api/slides", {
    method: "POST",
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
      showMessage("Slide saved!", "green");
      clearForm();
      loadSlideList();
    })
    .catch(function (error) {
      showMessage("Error: " + error.message, "red");
    });
}

function clearForm() {
  document.getElementById("title").value = "";
  document.getElementById("s_text").value = "";
  document.getElementById("s_vd").value = "";
  document.getElementById("s_image").value = "";
  document.getElementById("s_time").value = "";
  document.getElementById("rowsContainer").innerHTML = "";

  if (document.getElementById("slideType").value === "vq") {
    addRow();
  }
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
// ছবি দেখানো; ছবির ফাইল না পেলে নামটা লিখে জানানো
// ============================
function addPreviewImage(parent, fileName) {
  const img = document.createElement("img");
  img.className = "previewImg";
  img.src = fileName;
  img.alt = fileName;

  img.addEventListener("error", function () {
    const note = document.createElement("p");
    note.className = "previewHint";
    note.textContent = "(image file not found: " + fileName + ")";
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

      addPreviewParagraph(rowBlock, row.vd);

      if (row.multimedia) {
        addPreviewImage(rowBlock, row.multimedia);
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
    // আসল slide-এর মতোই: text না থাকলে VD দেখানো
    addPreviewParagraph(body, slide.text ? slide.text : slide.vd);

    if (slide.image) {
      addPreviewImage(body, slide.image);
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
// এখন পর্যন্ত থাকা সব slide দেখানো; নামে click করলে preview, সাথে Delete বাটন
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

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "danger";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", function () {
          deleteSlide(slide._id, getSlideLabel(slide));
        });

        item.appendChild(label);
        item.appendChild(deleteBtn);
        listBox.appendChild(item);
      }
    })
    .catch(function () {
      listBox.textContent = "Could not load slides. Is the backend running?";
    });
}

function deleteSlide(id, name) {
  const sure = confirm("Delete the slide \"" + name + "\"?");
  if (!sure) {
    return;
  }

  fetch(API_URL + "/api/slides/" + id, {
    method: "DELETE"
  })
    .then(function (response) {
      return response.json();
    })
    .then(function () {
      showMessage("Slide deleted.", "green");
      loadSlideList();
    })
    .catch(function () {
      showMessage("Could not delete the slide.", "red");
    });
}

document.getElementById("slideType").addEventListener("change", toggleFields);
document.getElementById("addRowBtn").addEventListener("click", addRow);
document.getElementById("saveBtn").addEventListener("click", saveSlide);

toggleFields();
loadSlideList();
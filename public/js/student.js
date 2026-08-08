// public/js/student.js

const DEFAULT_TASKS = {
  "read-aloud": {
    type: "read-aloud",
    label: "Read Aloud",
    title: "Read Aloud Practice",
    prompt: "Success is not final, failure is not fatal: it is the courage to continue that counts. Every expert was once a beginner who refused to give up.",
    instructions: "Score for pronunciation clarity, pacing, and intonation. Be strict about word accuracy — flag any skipped or mispronounced words.",
  },
  "ielts-cue-card": {
    type: "ielts-cue-card",
    label: "IELTS Cue Card",
    title: "Describe a Skill You Would Like to Learn",
    prompt: "Talk about a skill you would like to learn. You should say: what the skill is, why you want to learn it, how you would learn it, and explain how this skill would help you in the future. You will have 1-2 minutes to speak.",
    instructions: "Score using IELTS Speaking Part 2 criteria: fluency & coherence, lexical resource, grammatical range & accuracy, pronunciation. Give an approximate IELTS band (1-9) inside the score field scaled to 0-100 (band x 11).",
  },
};

let currentProfile = null;
let currentUid = null;
let activeTask = null;
let recognition = null;
let isRecording = false;
let finalTranscript = "";

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUid = user.uid;
  const snap = await db.ref("students/" + user.uid).once("value");
  currentProfile = snap.val();

  if (!currentProfile || currentProfile.status !== "approved") {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("student-name").textContent = currentProfile.name || "";
  await loadTasks();
});

document.getElementById("logout-btn").addEventListener("click", () => auth.signOut());

async function loadTasks() {
  const container = document.getElementById("task-tiles");
  container.innerHTML = "";

  for (const key of Object.keys(DEFAULT_TASKS)) {
    const snap = await db.ref("taskConfig/" + key).once("value");
    const override = snap.val() || {};
    const task = { ...DEFAULT_TASKS[key], ...override, type: key };

    const tile = document.createElement("div");
    tile.className = "task-tile";
    tile.innerHTML = `
      <span class="eyebrow">${task.label}</span>
      <h3 style="margin:8px 0 6px;">${task.title}</h3>
      <p class="muted" style="margin:0;">${truncate(task.prompt, 90)}</p>
    `;
    tile.addEventListener("click", () => openTask(task));
    container.appendChild(tile);
  }
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n) + "…" : str;
}

function openTask(task) {
  activeTask = task;
  finalTranscript = "";
  document.getElementById("task-list-view").classList.add("hidden");
  document.getElementById("active-task-view").classList.remove("hidden");
  document.getElementById("active-task-type").textContent = task.label;
  document.getElementById("active-task-title").textContent = task.title;
  document.getElementById("active-task-prompt").textContent = task.prompt;
  document.getElementById("transcript-box").textContent = "Your speech will appear here as you talk…";
  document.getElementById("submit-btn").disabled = true;
  document.getElementById("feedback-area").innerHTML = "";
  document.getElementById("record-status").textContent = "Tap to start recording";
  document.getElementById("mic-btn").classList.remove("recording");
}

document.getElementById("back-to-list").addEventListener("click", () => {
  if (isRecording) stopRecording();
  document.getElementById("active-task-view").classList.add("hidden");
  document.getElementById("task-list-view").classList.remove("hidden");
});

function getRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const r = new SpeechRecognition();
  r.continuous = true;
  r.interimResults = true;
  r.lang = "en-US";
  return r;
}

document.getElementById("mic-btn").addEventListener("click", () => {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
});

function startRecording() {
  recognition = getRecognition();
  if (!recognition) {
    document.getElementById("record-status").textContent =
      "Speech recognition isn't supported in this browser. Please use Chrome or Safari (not an in-app browser like WhatsApp).";
    return;
  }

  finalTranscript = "";
  isRecording = true;
  document.getElementById("mic-btn").classList.add("recording");
  document.getElementById("record-status").textContent = "Listening… tap again to stop";

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const text = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += text + " ";
      } else {
        interim += text;
      }
    }
    document.getElementById("transcript-box").textContent = (finalTranscript + interim).trim() || "Listening…";
  };

  recognition.onerror = (event) => {
    document.getElementById("record-status").textContent = "Mic error: " + event.error + ". Tap to try again.";
    stopRecording();
  };

  recognition.onend = () => {
    if (isRecording) {
      try { recognition.start(); } catch (e) {}
    }
  };

  recognition.start();
}

function stopRecording() {
  isRecording = false;
  if (recognition) {
    recognition.onend = null;
    recognition.stop();
  }
  document.getElementById("mic-btn").classList.remove("recording");
  document.getElementById("record-status").textContent = "Recording stopped. Review your transcript below.";
  document.getElementById("submit-btn").disabled = finalTranscript.trim().length < 3;
}

document.getElementById("submit-btn").addEventListener("click", async () => {
  const btn = document.getElementById("submit-btn");
  const feedbackArea = document.getElementById("feedback-area");
  btn.disabled = true;
  btn.textContent = "Scoring…";
  feedbackArea.innerHTML = `<p class="muted" style="margin-top:16px;">Sending your response to the AI coach…</p>`;

  try {
    const res = await fetch("/.netlify/functions/score-response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskType: activeTask.label,
        taskTitle: activeTask.title,
        taskPrompt: activeTask.prompt,
        instructions: activeTask.instructions,
        targetExam: currentProfile.targetExam || "General",
        transcript: finalTranscript.trim(),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      feedbackArea.innerHTML = `<div class="error-msg" style="margin-top:16px;">Scoring failed: ${data.error || "Unknown error"}. Please try again.</div>`;
      btn.disabled = false;
      btn.textContent = "Submit for scoring";
      return;
    }

    renderFeedback(data);

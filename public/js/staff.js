// public/js/staff.js

const EDITABLE_TASKS = {
  "read-aloud": {
    label: "Read Aloud",
    defaultTitle: "Read Aloud Practice",
    defaultPrompt: "Success is not final, failure is not fatal: it is the courage to continue that counts. Every expert was once a beginner who refused to give up.",
    defaultInstructions: "Score for pronunciation clarity, pacing, and intonation. Be strict about word accuracy — flag any skipped or mispronounced words.",
  },
  "ielts-cue-card": {
    label: "IELTS Cue Card",
    defaultTitle: "Describe a Skill You Would Like to Learn",
    defaultPrompt: "Talk about a skill you would like to learn. You should say: what the skill is, why you want to learn it, how you would learn it, and explain how this skill would help you in the future. You will have 1-2 minutes to speak.",
    defaultInstructions: "Score using IELTS Speaking Part 2 criteria: fluency & coherence, lexical resource, grammatical range & accuracy, pronunciation. Give an approximate IELTS band (1-9) inside the score field scaled to 0-100 (band x 11).",
  },
};

auth.onAuthStateChanged(async (user) => {
  if (!user) { window.location.href = "index.html"; return; }
  const snap = await db.ref("students/" + user.uid).once("value");
  const profile = snap.val();
  if (!profile || profile.role !== "staff") {
    window.location.href = "index.html";
    return;
  }
  document.getElementById("staff-name").textContent = profile.name || "Staff";
  loadStudents();
  loadTaskEditors();
});

document.getElementById("logout-btn").addEventListener("click", () => auth.signOut());

async function loadStudents() {
  const snap = await db.ref("students").once("value");
  const all = snap.val() || {};

  const pendingContainer = document.getElementById("pending-list");
  const allContainer = document.getElementById("all-students");
  pendingContainer.innerHTML = "";
  allContainer.innerHTML = "";

  const rows = [];
  let pendingCount = 0;

  Object.entries(all).forEach(([uid, s]) => {
    if (s.role === "staff") return;

    if (s.status === "pending") {
      pendingCount++;
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <strong>${s.name}</strong> — <span class="muted">${s.email}</span><br>
        <span class="muted">Target exam: ${s.targetExam || "—"}</span>
        <div style="margin-top:12px;">
          <button class="btn btn-gold approve-btn" data-uid="${uid}">Approve</button>
        </div>
      `;
      pendingContainer.appendChild(card);
    }

    rows.push(`
      <tr style="border-bottom:1px solid var(--cream-dark);">
        <td style="padding:10px 8px;">${s.name}</td>
        <td style="padding:10px 8px;" class="muted">${s.email}</td>
        <td style="padding:10px 8px;">${s.targetExam || "—"}</td>
        <td style="padding:10px 8px;">
          <span class="status-pill ${s.status === "approved" ? "status-approved" : "status-pending"}">${s.status}</span>
        </td>
      </tr>
    `);
  });

  if (pendingCount === 0) {
    pendingContainer.innerHTML = `<p class="muted">No pending approvals right now.</p>`;
  }

  allContainer.innerHTML = `
    <table style="width:100%; border-collapse:collapse;">
      <thead>
        <tr style="text-align:left; border-bottom:2px solid var(--maroon);">
          <th style="padding:8px;">Name</th><th style="padding:8px;">Email</th><th style="padding:8px;">Exam</th><th style="padding:8px;">Status</th>
        </tr>
      </thead>
      <tbody>${rows.join("")}</tbody>
    </table>
  `;

  document.querySelectorAll(".approve-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const uid = btn.dataset.uid;
      btn.disabled = true;
      btn.textContent = "Approving…";
      await db.ref("students/" + uid + "/status").set("approved");
      loadStudents();
    });
  });
}

async function loadTaskEditors() {
  const container = document.getElementById("task-editors");
  container.innerHTML = "";

  for (const [key, def] of Object.entries(EDITABLE_TASKS)) {
    const snap = await db.ref("taskConfig/" + key).once("value");
    const current = snap.val() || {};

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <span class="eyebrow">${def.label}</span>
      <h3 style="margin:8px 0 14px;">Edit this task</h3>
      <label>Title</label>
      <input type="text" class="edit-title" value="${(current.title || def.defaultTitle).replace(/"/g, '&quot;')}" />
      <label>Prompt shown to student</label>
      <textarea class="edit-prompt" rows="4">${current.prompt || def.defaultPrompt}</textarea>
      <label>Scoring guidance for AI</label>
      <textarea class="edit-instructions" rows="3">${current.instructions || def.defaultInstructions}</textarea>
      <button class="btn save-task-btn" data-key="${key}">Save changes</button>
      <span class="save-status muted" style="margin-left:10px;"></span>
    `;
    container.appendChild(card);

    card.querySelector(".save-task-btn").addEventListener("click", async () => {
      const title = card.querySelector(".edit-title").value.trim();
      const prompt = card.querySelector(".edit-prompt").value.trim();
      const instructions = card.querySelector(".edit-instructions").value.trim();
      const statusEl = card.querySelector(".save-status");

      await db.ref("taskConfig/" + key).set({ title, prompt, instructions });
      statusEl.textContent = "Saved ✓";
      setTimeout(() => (statusEl.textContent = ""), 2000);
    });
  }
}

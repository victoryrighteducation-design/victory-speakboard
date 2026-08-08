# SpeakBoard v2 — Victory Right Education

A rebuilt, simplified version of SpeakBoard. Two working modules to start:
**Read Aloud** and **IELTS Cue Card**. Scoring runs on Claude Haiku 4.5,
called through a secure backend function so no API key is ever exposed
in the browser.

---

## What's different from the old version

- Gemini 2.0 Flash (the old scoring model) was discontinued by Google on
  June 1, 2026 — that's why old scores were coming back blank/0.
- Login now uses **email directly** (no separate username lookup step),
  removing the whole class of pre-auth race-condition login bugs.
- AI calls happen through a **Netlify Function**, never directly from
  the browser — this avoids the "Failed to fetch" and exposed-API-key
  problems from before.
- Task prompts and scoring rubrics are editable **live from the Staff
  dashboard** — no code changes or redeploys needed to tweak a task.

---

## Setup

### 1. Firebase
Already set up (reusing the existing victory-speakboard project).

### 2. Make yourself staff
Register on the live site, then in Firebase Console → Realtime Database
→ Data, find your entry under `students/{your-uid}` and manually set
`"role": "staff"` and `"status": "approved"`.

### 3. Claude API key
Get one at console.anthropic.com → Settings → API Keys.

### 4. Deploy to Netlify
Connect this GitHub repo in Netlify. Publish directory: `public`.
Functions directory: `netlify/functions`. Add environment variable
`ANTHROPIC_API_KEY` with your key before deploying.

---

## Cost to run
Netlify + Firebase: free at this scale. Claude Haiku 4.5 scoring:
roughly ₹0.25–0.30 per scored response.

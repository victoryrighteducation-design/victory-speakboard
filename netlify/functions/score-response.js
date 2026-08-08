// netlify/functions/score-response.js
//
// This function runs on Netlify's server, NOT in the student's browser.
// The Claude API key lives only here (as an environment variable),
// so it is never visible in the website's source code.

const MODEL = "claude-haiku-4-5-20251001";

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Server is missing ANTHROPIC_API_KEY. Set it in Netlify: Site settings > Environment variables.",
      }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid request body" }),
    };
  }

  const {
    taskType = "General Speaking",
    taskTitle = "",
    taskPrompt = "",
    instructions = "",
    targetExam = "General",
    transcript = "",
  } = payload;

  if (!transcript || transcript.trim().length < 3) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "No speech was captured. Please try recording again." }),
    };
  }

  const systemPrompt = `You are an experienced English speaking coach at an Indian competitive-exam coaching institute (Victory Right Education). You score student speaking responses for exams such as SSC, Bank, IELTS, PTE, GRE, CAT, MAT, HSSC, Defence, Courts, and Duolingo.

Always respond with ONLY valid JSON, no markdown fences, no preamble, matching exactly this shape:
{
  "score": <number 0-100>,
  "band": "<one short label, e.g. 'Good', 'Needs Work', 'Excellent'>",
  "strengths": ["<short point>", "<short point>"],
  "mistakes": [
    {"issue": "<what went wrong>", "example": "<short quote or phrase from their speech>", "fix": "<how to correct it>"}
  ],
  "improvements": ["<short actionable tip>", "<short actionable tip>"],
  "encouragement": "<one warm, specific sentence to the student>"
}

Be specific and reference the student's actual words. Be encouraging but honest — do not inflate scores. Calibrate scoring to the target exam's real standards.`;

  const userPrompt = `Task type: ${taskType}
Task title: ${taskTitle}
Task prompt shown to student: ${taskPrompt}
Target exam: ${targetExam}
Staff scoring guidance: ${instructions || "Use standard grammar, vocabulary, fluency, and coherence criteria for this exam."}

Student's spoken response (transcribed):
"""
${transcript}
"""

Score this response now, following the JSON format exactly.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "AI scoring failed", detail: errText }),
      };
    }

    const data = await response.json();
    const rawText = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    let parsed;
    try {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "Could not parse AI response", raw: rawText }),
      };
    }

    return { statusCode: 200, headers, body: JSON.stringify(parsed) };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Unexpected server error", detail: String(err) }),
    };
  }
};

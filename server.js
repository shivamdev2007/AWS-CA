require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY is missing. Add it to your .env file and restart the server." });
    const messages = req.body?.messages;
    if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ error: "Send at least one message." });

    const contents = messages.slice(-20).map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content || "").slice(0, 12000) }]
    })).filter(m => m.parts[0].text.trim());

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(apiKey),
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        systemInstruction: { parts: [{ text: "You are a helpful, clear AI assistant. Explain things in a friendly and accurate way. Use Markdown when useful." }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      }) }
    );
    const data = await response.json();
    if (!response.ok) {
      const message = data?.error?.message || "AI provider request failed.";
      return res.status(response.status).json({ error: message });
    }
    const reply = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();
    if (!reply) return res.status(502).json({ error: "The AI provider returned an empty response." });
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error. Check the terminal for details." });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Chat Studio backend running at http://localhost:${port}`));

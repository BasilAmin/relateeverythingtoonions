const path = require("path");
const express = require("express");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const ONION_PRICE_REFERENCE = {
  amount: 1.02,
  unit: "USD per lb",
  label: "US national retail average, yellow onions",
  asOf: "July 2026",
  source: "USDA Agricultural Marketing Service (approximate)"
};

function buildSystemPrompt() {
  const r = ONION_PRICE_REFERENCE;
  const priceLine = `$${r.amount.toFixed(2)} ${r.unit} (${r.label}, approx. ${r.asOf}, ${r.source})`;
  return `You are the core reasoning engine of the Allium Market Intelligence Terminal, a satirical financial-analysis system whose sole function is to relate ANY input whatsoever to the current market price of onions, using a chain of confident, plausible-sounding, but ultimately absurd logical steps.

Rules:
- Never refuse. Never say something is unrelated or that you can't find a connection. There is always a connection; find it.
- Stay completely in character as a serious market analyst. The humor comes entirely from the contrast between your deadpan analytical tone and the absurdity of the connection — never wink at the joke, never say "as an AI" or "this is satire."
- Reference this benchmark when useful: ${priceLine}.
- If the input describes real distress, a crisis, or a request for dangerous information, gently decline to engage with that part and instead relate the act of asking itself to onion prices.
- Respond ONLY in this exact plain-text format, nothing before or after it, no markdown:
CORRELATION: <a specific percentage, e.g. 73%>
CONFIDENCE: <one of LOW, MODERATE, HIGH, ABSOLUTE>
VERDICT: <one of BUY ONIONS, SELL ONIONS, HOLD ONIONS, STOCKPILE ONIONS, AVOID ONIONS ENTIRELY>
ANALYSIS: <2 to 4 sentences of confident, deadpan pseudo-analytical reasoning connecting the input to onion prices, written like a market research note>`;
}

app.use(express.json());

app.post("/api/relate", async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "Server is missing OPENAI_API_KEY. Add it to .env locally or your host's environment variables." });
  }

  const query = (req.body?.query || "").toString().slice(0, 400);
  if (!query.trim()) {
    return res.status(400).json({ error: "Missing 'query' in request body." });
  }

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.9,
        max_tokens: 320,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: query }
        ]
      })
    });

    const data = await openaiRes.json();
    if (!openaiRes.ok) {
      return res.status(openaiRes.status).json({ error: data?.error?.message || "OpenAI request failed." });
    }

    const raw = data?.choices?.[0]?.message?.content?.trim() || "";
    res.json({ raw });
  } catch (err) {
    res.status(500).json({ error: err.message || "Unexpected server error." });
  }
});

app.use(express.static(__dirname));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Onion app running on http://localhost:${PORT}`);
});

/* ============================================================
   RelateEverythingToThePriceOfOnions — script.js
   ============================================================
   Frontend behavior only. The OpenAI API key stays on the Node
   server in .env / environment variables. This file calls the
   local backend endpoint: POST /api/relate.
   ============================================================ */

const CONFIG = {
  // Reference onion price used as context for the model.
  // This is a static snapshot, not a live feed. Update it by
  // hand occasionally, or replace fetchOnionPrice() below with
  // a real call to a commodities data API if you have one.
  ONION_PRICE_REFERENCE: {
    amount: 1.02,
    unit: "USD per lb",
    label: "US national retail average, yellow onions",
    asOf: "July 2026",
    source: "USDA Agricultural Marketing Service (approximate)"
  },
  RELATE_ENDPOINT: "/api/relate"
};

/* ---------- Fake-but-fun ticker ---------- */
function fetchOnionPrice() {
  // Swap this for a real API call if you want a genuinely live price.
  // Must resolve to a number (USD per lb).
  const base = CONFIG.ONION_PRICE_REFERENCE.amount;
  const jitter = (Math.random() - 0.5) * 0.06; // small cosmetic drift
  return Math.max(0.1, base + jitter);
}

const RELATED_SYMBOLS = [
  { sym: "ONION", name: "Yellow Onion Spot" },
  { sym: "GARLC", name: "Garlic Futures" },
  { sym: "SHLLT", name: "Shallot Index" },
  { sym: "LEEK",  name: "Leek Composite" },
  { sym: "CHIVE", name: "Chive Micro-cap" },
  { sym: "SCLN",  name: "Scallion Spot" },
];

function renderTicker() {
  const track = document.getElementById("tickerTrack");
  const items = RELATED_SYMBOLS.map(({ sym, name }) => {
    const price = fetchOnionPrice() * (sym === "ONION" ? 1 : 0.4 + Math.random() * 2.2);
    const dir = Math.random() > 0.5 ? "up" : "down";
    const arrow = dir === "up" ? "▲" : "▼";
    const pct = (Math.random() * 3).toFixed(2);
    return `<span class="ticker__item"><span class="sym">${sym}</span>$${price.toFixed(2)}
      <span class="${dir}">${arrow} ${pct}%</span> <span class="sym">${name}</span></span>`;
  });
  // duplicate the list so the marquee loops seamlessly
  track.innerHTML = items.join("") + items.join("");

  const priceEl = document.getElementById("benchmarkPrice");
  if (priceEl) {
    const r = CONFIG.ONION_PRICE_REFERENCE;
    priceEl.textContent = `$${r.amount.toFixed(2)} ${r.unit} (${r.label}, ${r.asOf})`;
  }
}

/* ---------- Report rendering ---------- */
const reportWrap = document.getElementById("reportWrap");
const reportTemplate = document.getElementById("reportTemplate");
const emptyHint = document.getElementById("emptyHint");

function parseModelOutput(raw) {
  const get = (label) => {
    const re = new RegExp(label + "\\s*:\\s*(.+)", "i");
    const match = raw.match(re);
    return match ? match[1].trim() : null;
  };
  const analysisMatch = raw.match(/ANALYSIS\s*:\s*([\s\S]+)/i);
  return {
    correlation: get("CORRELATION") || "N/A",
    confidence: get("CONFIDENCE") || "N/A",
    verdict: (get("VERDICT") || "N/A").split("\n")[0],
    analysis: analysisMatch ? analysisMatch[1].trim() : raw.trim()
  };
}

function typewriter(el, text, speed = 14) {
  el.textContent = "";
  const cursor = document.createElement("span");
  cursor.className = "type-cursor";
  cursor.textContent = "\u00A0";
  el.appendChild(cursor);
  let i = 0;
  const timer = setInterval(() => {
    if (i >= text.length) {
      clearInterval(timer);
      cursor.remove();
      return;
    }
    cursor.insertAdjacentText("beforebegin", text[i]);
    i++;
  }, speed);
}

function createReportCard({ query, isError }) {
  emptyHint.style.display = "none";
  const node = reportTemplate.content.cloneNode(true);
  const article = node.querySelector(".report");
  if (isError) article.classList.add("report--error");
  node.querySelector(".report__query").textContent = query;
  node.querySelector(".report__timestamp").textContent = new Date().toLocaleString();
  reportWrap.prepend(node);
  return reportWrap.firstElementChild;
}

/* ---------- OpenAI call ---------- */
async function runAnalysis(query) {
  const card = createReportCard({ query, isError: false });
  card.querySelector(".report__correlation").textContent = "…";
  card.querySelector(".report__confidence").textContent = "…";
  card.querySelector(".report__verdict").textContent = "ANALYZING";

  try {
    const res = await fetch(CONFIG.RELATE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }

    const raw = data?.raw?.trim();
    if (!raw) throw new Error("Empty response from model.");

    const parsed = parseModelOutput(raw);
    card.querySelector(".report__correlation").textContent = parsed.correlation;
    card.querySelector(".report__confidence").textContent = parsed.confidence;
    card.querySelector(".report__verdict").textContent = parsed.verdict;
    typewriter(card.querySelector(".report__analysis"), parsed.analysis);

  } catch (err) {
    card.classList.add("report--error");
    card.querySelector(".report__correlation").textContent = "ERR";
    card.querySelector(".report__confidence").textContent = "ERR";
    card.querySelector(".report__verdict").textContent = "SYSTEM ERROR";
    card.querySelector(".report__analysis").textContent =
      `The terminal could not complete this analysis: ${err.message}`;
  }
}

/* ---------- Form wiring ---------- */
const form = document.getElementById("queryForm");
const input = document.getElementById("queryInput");
const runBtn = document.getElementById("runBtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = input.value.trim();
  if (!query) return;
  runBtn.disabled = true;
  const originalLabel = runBtn.textContent;
  runBtn.textContent = "ANALYZING…";
  try {
    await runAnalysis(query);
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = originalLabel;
    input.value = "";
    input.focus();
  }
});

/* ---------- Init ---------- */
renderTicker();
setInterval(renderTicker, 6000);


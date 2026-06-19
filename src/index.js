const express = require("express");
const cron = require("node-cron");

const app = express();
const PORT = process.env.PORT || 3000;
const INTERVAL_MINUTES = parseInt(process.env.INTERVAL_MINUTES, 10) || 10;
const URLS = (process.env.URLS || "").split(",").map((s) => s.trim()).filter(Boolean);

let pingResults = [];

async function ping(url) {
  const start = Date.now();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const ms = Date.now() - start;
    return { url, status: response.status, ok: response.ok, ms };
  } catch (err) {
    return { url, status: null, ok: false, ms: Date.now() - start, error: err.message };
  }
}

async function pingAll() {
  console.log(`[${new Date().toISOString()}] Pinging ${URLS.length} URL(s)...`);
  const results = await Promise.all(URLS.map(ping));
  pingResults = results;

  for (const r of results) {
    const icon = r.ok ? "OK" : "FAIL";
    console.log(`  [${icon}] ${r.url} → ${r.status || r.error} (${r.ms}ms)`);
  }
}

if (URLS.length > 0) {
  const cronExpr = `*/${INTERVAL_MINUTES} * * * *`;
  console.log(`Scheduling ping every ${INTERVAL_MINUTES} min (cron: ${cronExpr})`);
  cron.schedule(cronExpr, pingAll);

  pingAll();
} else {
  console.log("No URLS configured — set the URLS env var with a comma-separated list.");
}

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    intervalMinutes: INTERVAL_MINUTES,
    urls: URLS,
    lastPing: pingResults,
  });
});

app.get("/ping", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Bot listening on port ${PORT}`);
});

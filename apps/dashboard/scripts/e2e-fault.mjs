/**
 * End-to-end fault scenario against the LOCAL stack
 * (supabase start + mosquitto + simulator + worker + `pnpm start` on :3100).
 *
 *   node scripts/e2e-fault.mjs [device_id]
 *
 * 1. Signs in with a magic link for a local test address (read from Mailpit).
 * 2. Presses "Motoru Isıt" on /devices/<id> and samples status, health and ETA every 5 s.
 * 3. Checks the alert toast and the /alerts record.
 * 4. Presses "Normale Döndür" and watches the health score recover.
 *
 * The worker needs ~10 minutes of warm-up after start for ETA forecasts.
 * QUICK=1 stops after one inject/clear round trip (smoke test).
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54424";
const DEVICE = process.argv[2] ?? "mt-01";
const EMAIL = `e2e-${Date.now()}@smartgrid.test`;
const FAULT_WINDOW_S = 240;
const RECOVERY_WINDOW_S = 120;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const log = (...args) => console.log(`[${String(Math.round((Date.now() - t0) / 1000)).padStart(4)} s]`, ...args);

async function magicLink() {
  for (let i = 0; i < 20; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/search?query=to:${encodeURIComponent(EMAIL)}`)).json();
    const id = list.messages?.[0]?.ID;
    if (id) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${id}`)).json();
      const match = /href="([^"]+\/auth\/v1\/verify[^"]+)"/.exec(msg.HTML ?? "");
      if (match) return match[1].replaceAll("&amp;", "&");
    }
    await sleep(500);
  }
  throw new Error("magic link e-mail not found in Mailpit");
}

async function sample(page) {
  return page.evaluate(() => {
    const header = document.querySelector("main section");
    const badge = header?.querySelector("span.rounded-pill")?.textContent?.trim() ?? "?";
    const ring = document.querySelector('svg[aria-label*="sağlık skoru"]')?.getAttribute("aria-label") ?? "";
    const health = Number(/: (\d+) \/ 100/.exec(ring)?.[1] ?? NaN);
    const eta = header?.querySelector('[aria-live="polite"] p')?.textContent?.trim() ?? "";
    const toasts = [...document.querySelectorAll('[aria-label="Alarm bildirimleri"] li')].map((li) =>
      li.textContent?.trim().slice(0, 140),
    );
    return { badge, health, eta, toasts };
  });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));

// 1. Sign in
await page.goto(`${BASE}/login?next=/devices/${DEVICE}`);
await page.getByLabel("E-posta").fill(EMAIL);
await page.getByRole("button", { name: "Giriş bağlantısı gönder" }).click();
await page.getByText("E-postanı kontrol et").waitFor();
await page.goto(await magicLink());
await page.waitForURL(`**/devices/${DEVICE}`);
await page.getByRole("button", { name: "Çıkış" }).waitFor();
await page.getByText("Canlı", { exact: true }).waitFor({ timeout: 15_000 });
log("signed in as", EMAIL, "- realtime live");

// 2. Inject overheat
const before = await sample(page);
log("before:", before.badge, "health", before.health, "|", before.eta);
await page.getByRole("button", { name: "Motoru Isıt" }).click();
await page.getByRole("button", { name: "Motoru Isıt", pressed: true }).waitFor({ timeout: 10_000 });
const injectedAt = Date.now();
log("overheat injected (pill filled)");

if (process.env.QUICK === "1") {
  // Smoke mode: proves session + /api/sim + MQTT + fault relay, then cleans up.
  await page.getByRole("button", { name: "Normale Döndür" }).click();
  await page.getByRole("button", { name: "Motoru Isıt", pressed: false }).waitFor({ timeout: 10_000 });
  log("cleared (pill empty) - quick mode done");
  await browser.close();
  console.log("console errors:", consoleErrors.length ? consoleErrors : "none");
  process.exit(consoleErrors.length ? 1 : 0);
}

const timeline = [];
let firstWarning = null;
let firstCritical = null;
const etas = [];
const seenToasts = new Set();
while ((Date.now() - injectedAt) / 1000 < FAULT_WINDOW_S) {
  await sleep(5_000);
  const s = await sample(page);
  const t = Math.round((Date.now() - injectedAt) / 1000);
  timeline.push({ t, ...s });
  if (s.badge === "Uyarı" && firstWarning === null) firstWarning = t;
  if (s.badge === "Kritik" && firstCritical === null) firstCritical = t;
  const m = /~(\d+) dk/.exec(s.eta);
  if (m) etas.push({ t, minutes: Number(m[1]) });
  for (const toast of s.toasts) {
    if (!seenToasts.has(toast)) {
      seenToasts.add(toast);
      log("TOAST:", toast);
    }
  }
  log(`+${t}s`, s.badge.padEnd(6), "health", String(s.health).padStart(3), "|", s.eta);
  if (firstCritical !== null && t - firstCritical >= 20) break;
}

// 3. Alerts page
await page.goto(`${BASE}/alerts`);
const alertRows = await page
  .getByRole("main")
  .getByRole("listitem")
  .filter({ hasText: DEVICE.toUpperCase() })
  .allTextContents();
log(`/alerts rows for ${DEVICE}:`, alertRows.length);
for (const row of alertRows.slice(0, 4)) log("  ", row.replace(/\s+/g, " ").slice(0, 160));

// 4. Back to normal
await page.goto(`${BASE}/devices/${DEVICE}`);
await page.getByText("Canlı", { exact: true }).waitFor({ timeout: 15_000 });
await page.getByRole("button", { name: "Normale Döndür" }).click();
await page.getByRole("button", { name: "Motoru Isıt", pressed: false }).waitFor({ timeout: 10_000 });
const clearedAt = Date.now();
log("cleared (pill empty)");
const recovery = [];
while ((Date.now() - clearedAt) / 1000 < RECOVERY_WINDOW_S) {
  await sleep(10_000);
  const s = await sample(page);
  recovery.push({ t: Math.round((Date.now() - clearedAt) / 1000), health: s.health, badge: s.badge });
  log(`recovery +${recovery.at(-1).t}s`, s.badge, "health", s.health);
}

await browser.close();

console.log("\n=== SUMMARY ===");
console.log("first warning :", firstWarning === null ? "never" : `+${firstWarning} s`);
console.log("first critical:", firstCritical === null ? "never" : `+${firstCritical} s`);
console.log("ETA samples   :", etas.map((e) => `+${e.t}s ~${e.minutes}dk`).join(", ") || "none");
console.log("toasts        :", seenToasts.size);
console.log("alerts rows   :", alertRows.length);
console.log("recovery      :", recovery.map((r) => `${r.health}`).join(" → "));
console.log("console errors:", consoleErrors.length ? consoleErrors : "none");

/**
 * Captures frames of the live fault scenario for the README demo GIF.
 * Needs the local stack (`pnpm run up`) with the worker running for >= 10 min (ETA warm-up).
 *
 *   node scripts/demo/capture.mjs <frames_dir> [base_url]
 *   uv run --with pillow python scripts/demo/make_gif.py <frames_dir> docs/demo.gif
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

// Resolve Playwright from the dashboard workspace.
const require = createRequire(new URL("../../apps/dashboard/package.json", import.meta.url));
const { chromium } = require("@playwright/test");

const OUT = process.argv[2] ?? "demo-frames";
const BASE = process.argv[3] ?? "http://localhost:3000";
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54424";
const INTENSITY = process.env.DEMO_INTENSITY ?? "1.5";
const FRAME_MS = 2_000;
const MAX_S = 240;
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function magicLink(email) {
  for (let i = 0; i < 30; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/search?query=to:${encodeURIComponent(email)}`)).json();
    const id = list.messages?.[0]?.ID;
    if (id) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${id}`)).json();
      const m = /href="([^"]+\/auth\/v1\/verify[^"]+)"/.exec(msg.HTML ?? "");
      if (m) return m[1].replaceAll("&amp;", "&");
    }
    await sleep(500);
  }
  throw new Error("magic link not found");
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, colorScheme: "light" });
const email = `demo-${Date.now()}@smartgrid.test`;
await page.goto(`${BASE}/login?next=/devices/mt-01`);
await page.getByLabel("E-posta").fill(email);
await page.getByRole("button", { name: "Giriş bağlantısı gönder" }).click();
await page.getByText("E-postanı kontrol et").waitFor();
await page.goto(await magicLink(email));
await page.waitForURL("**/devices/mt-01");
await page.getByText("Canlı", { exact: true }).waitFor({ timeout: 15_000 });
await page.getByRole("slider").fill(INTENSITY);

const header = page.getByRole("main").locator("section").first();
const status = header.locator("span.rounded-pill").first();
const frames = [];
let n = 0;
async function frame(label, t) {
  const file = join(OUT, `f${String(n++).padStart(4, "0")}.png`);
  // Keep the simulation pills in view alongside the header: scroll to top, small zoom-out.
  await page.screenshot({ path: file });
  frames.push({ file, label, t, status: (await status.textContent())?.trim() });
}

// A few frames of the healthy device.
for (let i = 0; i < 4; i++) {
  await frame("Normal filo", -((4 - i) * FRAME_MS) / 1000);
  await sleep(FRAME_MS);
}

await page.getByRole("button", { name: "Motoru Isıt" }).click();
const t0 = Date.now();
let criticalAt = null;
while ((Date.now() - t0) / 1000 < MAX_S) {
  const t = Math.round((Date.now() - t0) / 1000);
  await frame("Motoru Isıt", t);
  const s = frames.at(-1).status;
  if (s === "Kritik" && criticalAt === null) criticalAt = t;
  if (criticalAt !== null && t - criticalAt >= 12) break;
  await sleep(FRAME_MS);
}

await page.getByRole("button", { name: "Normale Döndür" }).click();
await browser.close();
writeFileSync(join(OUT, "frames.json"), JSON.stringify(frames, null, 2));
console.log(`${frames.length} frames, critical at +${criticalAt ?? "never"} s`);

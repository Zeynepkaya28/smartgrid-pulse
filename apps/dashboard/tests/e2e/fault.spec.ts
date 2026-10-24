/**
 * End-to-end fault scenario against a running local stack (`pnpm run up`):
 *   E2E_BASE_URL=http://localhost:3000 pnpm --filter @smartgrid/dashboard test:e2e
 *
 * Signs in with a magic link read from the local Mailpit inbox, so it must never run
 * against production.
 */
import { expect, test, type Page } from "@playwright/test";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54424";
const DEVICE = "mt-01";
const CRITICAL_WITHIN_MS = 180_000;

test.describe.configure({ mode: "serial" });

async function magicLink(email: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const list = (await (await fetch(`${MAILPIT}/api/v1/search?query=to:${encodeURIComponent(email)}`)).json()) as {
      messages?: Array<{ ID: string }>;
    };
    const id = list.messages?.[0]?.ID;
    if (id) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${id}`)).json()) as { HTML?: string };
      const match = /href="([^"]+\/auth\/v1\/verify[^"]+)"/.exec(msg.HTML ?? "");
      if (match?.[1]) return match[1].replaceAll("&amp;", "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`no magic link for ${email} in Mailpit`);
}

async function signIn(page: Page, next: string) {
  const email = `e2e-${Date.now()}@smartgrid.test`;
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("E-posta").fill(email);
  await page.getByRole("button", { name: "Giriş bağlantısı gönder" }).click();
  await expect(page.getByText("E-postanı kontrol et")).toBeVisible();
  await page.goto(await magicLink(email));
  await page.waitForURL(`**${next}`);
  await expect(page.getByRole("button", { name: "Çıkış" })).toBeVisible();
}

test("home page shows the live fleet of 12 devices", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Her makinenin nabzı");
  await expect(page.getByText("Canlı", { exact: true })).toBeVisible({ timeout: 15_000 });
  const cards = page.locator('section[aria-labelledby="cihazlar"] a[href^="/devices/"]');
  await expect(cards).toHaveCount(12);
});

test("overheat on mt-01 turns the device critical within 180 s and records an alert", async ({ page }) => {
  test.setTimeout(6 * 60_000);
  await signIn(page, `/devices/${DEVICE}`);
  await expect(page.getByText("Canlı", { exact: true })).toBeVisible({ timeout: 15_000 });

  const header = page.getByRole("main").locator("section").first();
  const status = header.locator("span.rounded-pill").first();

  // Start from a healthy device (a previous run may still be recovering).
  const clear = page.getByRole("button", { name: "Normale Döndür" });
  if (await clear.isEnabled()) await clear.click();
  await expect(status).toHaveText("Normal", { timeout: 150_000 });

  // 2x intensity: at 1x the motor's load cycle can push "critical" just past 180 s.
  await page.getByRole("slider").fill("2");
  await page.getByRole("button", { name: "Motoru Isıt" }).click();
  await expect(page.getByRole("button", { name: "Motoru Isıt", pressed: true })).toBeVisible({ timeout: 10_000 });
  const injectedAt = Date.now();

  try {
    await expect(status).toHaveText("Kritik", { timeout: CRITICAL_WITHIN_MS });
    console.log(`critical after ${Math.round((Date.now() - injectedAt) / 1000)} s`);

    // Toast in the top-right corner…
    await expect(
      page.getByRole("region", { name: "Alarm bildirimleri" }).getByText("Kritik").first(),
    ).toBeVisible({ timeout: 15_000 });

    // …and a stored alert on /alerts.
    await page.goto("/alerts");
    const latest = page.getByRole("main").getByRole("listitem").filter({ hasText: "Motor MT-01" }).first();
    await expect(latest).toContainText("Kritik");
    await expect(latest.getByRole("button", { name: /^Onayla/ })).toBeVisible();
  } finally {
    await page.goto(`/devices/${DEVICE}`);
    await page.getByRole("button", { name: "Normale Döndür" }).click();
  }
});

/**
 * Responsive layout check: every page at 390 / 768 / 1440 px in light and dark mode.
 * Asserts no horizontal overflow and no console errors (incl. hydration mismatches),
 * and saves a full-page screenshot to tests/screenshots/.
 */
import { expect, test } from "@playwright/test";

const PAGES = [
  { name: "home", path: "/" },
  { name: "devices", path: "/devices" },
  { name: "device-mt-01", path: "/devices/mt-01" },
  { name: "alerts", path: "/alerts" },
  { name: "simulator", path: "/simulator" },
] as const;

const WIDTHS = [390, 768, 1440] as const;
const SCHEMES = ["light", "dark"] as const;

for (const page of PAGES) {
  for (const width of WIDTHS) {
    for (const scheme of SCHEMES) {
      test(`${page.name} @ ${width}px ${scheme}`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          colorScheme: scheme,
          reducedMotion: "reduce",
        });
        const tab = await context.newPage();
        const errors: string[] = [];
        tab.on("console", (msg) => {
          if (msg.type() === "error") errors.push(msg.text());
        });
        tab.on("pageerror", (err) => errors.push(err.message));

        await tab.goto(page.path, { waitUntil: "networkidle" });
        await expect(tab.locator("h1")).toHaveCount(1);

        const overflow = await tab.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          client: document.documentElement.clientWidth,
          offenders: [...document.querySelectorAll("body *")]
            .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
            .slice(0, 5)
            .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`),
        }));
        expect(overflow.scroll, `overflowing: ${overflow.offenders.join(", ")}`).toBeLessThanOrEqual(
          overflow.client,
        );

        await tab.screenshot({
          path: `tests/screenshots/${page.name}-${width}-${scheme}.png`,
          fullPage: true,
          animations: "disabled",
        });
        expect(errors).toEqual([]);
        await context.close();
      });
    }
  }
}

test("mobile menu opens and closes", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const tab = await context.newPage();
  await tab.goto("/");
  const toggle = tab.getByRole("button", { name: "Menüyü aç" });
  await toggle.click();
  await expect(tab.getByRole("link", { name: "Alarmlar" }).last()).toBeVisible();
  await tab.keyboard.press("Escape");
  await expect(tab.getByRole("button", { name: "Menüyü aç" })).toHaveAttribute("aria-expanded", "false");
  await context.close();
});

test("segmented control switches range with arrow keys", async ({ page }) => {
  await page.goto("/devices/mt-01");
  const group = page.getByRole("radiogroup", { name: "Zaman aralığı" });
  await group.getByRole("radio", { name: "Son 1 saat" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(group.getByRole("radio", { name: "Son 6 saat" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("heading", { name: "Son 6 saat." })).toBeVisible();
});

test("alerts can be filtered and acknowledged", async ({ page }) => {
  await page.goto("/alerts");
  await expect(page.getByText("4 alarm onay bekliyor.")).toBeVisible();
  await page.getByRole("radio", { name: "Kritik" }).click();
  await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(2);
  await page.getByRole("button", { name: /^Onayla/ }).first().click();
  await expect(page.getByText("3 alarm onay bekliyor.")).toBeVisible();
});

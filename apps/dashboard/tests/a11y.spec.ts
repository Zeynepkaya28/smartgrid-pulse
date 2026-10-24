/**
 * WCAG 2.1 AA audit with axe-core (the engine behind Lighthouse's accessibility score)
 * on every page in both color schemes. Playwright emulates prefers-color-scheme
 * reliably, which Lighthouse's headless Chrome does not.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = ["/", "/devices", "/devices/mt-01", "/alerts", "/simulator", "/login"] as const;
const SCHEMES = ["light", "dark"] as const;

for (const path of PAGES) {
  for (const scheme of SCHEMES) {
    test(`a11y ${path} ${scheme}`, async ({ browser }) => {
      const context = await browser.newContext({ colorScheme: scheme, reducedMotion: "reduce" });
      const page = await context.newPage();
      await page.goto(path, { waitUntil: "networkidle" });

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const summary = results.violations.map(
        (v) => `${v.id}: ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(" ")}`,
      );
      expect(summary).toEqual([]);
      await context.close();
    });
  }
}

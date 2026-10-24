import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
// Set E2E_BASE_URL to test an already running stack (e.g. `pnpm run up` on :3000).
const EXTERNAL = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: EXTERNAL ?? `http://127.0.0.1:${PORT}`,
    ...devices["Desktop Chrome"],
  },
  projects: [
    // Layout, accessibility and visitor checks (need local Supabase; worker optional).
    { name: "ui", testIgnore: /e2e\// },
    // Full fault scenario (needs simulator + worker + Mailpit), run on demand.
    { name: "e2e", testMatch: /e2e\/.*\.spec\.ts/, fullyParallel: false },
  ],
  webServer: EXTERNAL
    ? undefined
    : {
        // Production build, so screenshots match what Vercel serves.
        command: "pnpm build && pnpm start",
        url: `http://127.0.0.1:${PORT}`,
        // Always build fresh so a stale server never hides changes.
        reuseExistingServer: false,
        timeout: 180_000,
      },
});

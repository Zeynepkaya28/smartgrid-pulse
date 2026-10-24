import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    ...devices["Desktop Chrome"],
  },
  webServer: {
    // Production build, so screenshots match what Vercel serves.
    command: "pnpm build && pnpm start",
    url: `http://127.0.0.1:${PORT}`,
    // Always build fresh so a stale server never hides changes.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  fullyParallel: false,
  reporter: [["list"], ["html", { outputFolder: "e2e-report", open: "never" }]],
  use: {
    baseURL: process.env.BOOKREVISE_E2E_BASE_URL ?? "http://127.0.0.1:3000",
    storageState: process.env.BOOKREVISE_E2E_STORAGE_STATE,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.BOOKREVISE_E2E_BASE_URL ? undefined : { command: "pnpm dev", url: "http://127.0.0.1:3000", reuseExistingServer: true, timeout: 120_000 },
});

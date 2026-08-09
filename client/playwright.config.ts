import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Runs a SEPARATE dev server on :3001, purely for E2E tests, pointed at
  // the backend directly (localhost:4010) instead of the ngrok tunnel your
  // main :3000 dev server uses for Mini App testing. This means running
  // tests never disturbs your normal Telegram/Mini-App dev workflow, and we
  // never have to manually swap env files or restart the main dev server.
  webServer: {
    command: "NEXT_PUBLIC_API_BASE_URL=http://localhost:4010/api/v1 NEXT_PUBLIC_PLATFORM_AUTH_BOT_USERNAME=GebeyaBotAuthBot PLAYWRIGHT_TEST_DIST_DIR=.next-test npx next dev -p 3001",
    url: "http://localhost:3001",
    reuseExistingServer: true,
    timeout: 30000,
  },
});

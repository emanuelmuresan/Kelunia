import { defineConfig, devices } from "@playwright/test";

// Dedicated port so an e2e run never collides with a dev server on :3000.
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * E2E runs the real static export (next build -> out/) served statically, against
 * the Firebase emulators — no dev server, so the Next error overlay never masks
 * the app. Start it through:
 *   firebase emulators:exec --project demo-kelunia --only auth,firestore \
 *     "node e2e/seed.mjs && npx playwright test"
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  timeout: 60_000,
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run build && npx serve out --listen ${PORT} --no-clipboard --no-request-logging`,
    url: BASE_URL,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_FIREBASE_EMULATOR: "1",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-kelunia",
      NEXT_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-kelunia.firebaseapp.com",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:1:web:demo",
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "1",
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-kelunia.appspot.com",
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "",
      NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "",
    },
  },
});

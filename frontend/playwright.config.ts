import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";

// Chromium pré-installé dans certains environnements ; sinon Playwright utilise le sien.
const executablePath = fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
const launchOptions = { executablePath, args: ["--no-sandbox"] };

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  reporter: "list",
  use: {
    // Le service worker du mode hors connexion contournerait les réponses simulées (page.route) : bloqué sauf dans son test.
    serviceWorkers: "block", baseURL: "http://localhost:3100", trace: "off" },
  webServer: {
    command: "npm run build && npx next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
  projects: [
    { name: "ordinateur", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, launchOptions } },
    { name: "telephone", use: { ...devices["iPhone 12"], defaultBrowserType: "chromium", launchOptions } },
  ],
});

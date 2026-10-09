import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

// Keeping downloads in the workspace also works in restricted Windows environments.
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.resolve(
  __dirname,
  "../.cache/browsers",
);
const python =
  process.platform === "win32"
    ? ".venv\\Scripts\\python.exe"
    : ".venv/bin/python";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3001",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: [
    {
      command: `${python} -m scripts.serve_test`,
      cwd: "../backend",
      url: "http://127.0.0.1:8001/health",
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        DATABASE_URL: "sqlite:///../.cache/e2e.db",
        CORS_ORIGINS: '["http://127.0.0.1:3001"]',
      },
    },
    {
      command: "npm run dev -- --port 3001",
      url: "http://127.0.0.1:3001/workspace",
      reuseExistingServer: false,
      timeout: 120_000,
      env: { API_BASE_URL: "http://127.0.0.1:8001", NEXT_DIST_DIR: ".next-e2e" },
    },
  ],
});

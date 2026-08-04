import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3000";
const entornoE2E = {
  ...process.env,
  DATABASE_URL: "file:./test-e2e.db?socket_timeout=30",
  AUTH_SECRET: "clave-e2e-aislada-de-al-menos-32-caracteres",
  STORAGE_DRIVER: "filesystem",
  UPLOADS_ROOT: path.join(process.cwd(), ".e2e-uploads"),
  NEXT_PUBLIC_APP_URL: baseURL,
};

Object.assign(process.env, entornoE2E);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `"${process.execPath}" tests/e2e/preparar-entorno.mjs`,
    url: baseURL,
    env: entornoE2E,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});

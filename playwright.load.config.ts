import path from "node:path";
import { defineConfig } from "@playwright/test";

const baseURL = process.env.LOAD_BASE_URL ?? "http://127.0.0.1:3000";
const local = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(baseURL);
const entorno = {
  ...process.env,
  DATABASE_URL: process.env.LOAD_DATABASE_URL ?? "file:./test-e2e.db?socket_timeout=30",
  AUTH_SECRET: "clave-load-aislada-de-al-menos-32-caracteres",
  STORAGE_DRIVER: "filesystem",
  UPLOADS_ROOT: path.join(process.cwd(), ".e2e-uploads"),
  NEXT_PUBLIC_APP_URL: baseURL,
  LOAD_BASE_URL: baseURL,
};

Object.assign(process.env, entorno);

export default defineConfig({
  testDir: "./tests/load",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL, trace: "retain-on-failure" },
  webServer: local ? {
    command: `"${process.execPath}" tests/e2e/preparar-entorno.mjs`,
    url: baseURL,
    env: entorno,
    reuseExistingServer: false,
    timeout: 180_000,
  } : undefined,
});

import { rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const raiz = process.cwd();
const entorno = {
  ...process.env,
  DATABASE_URL: "file:./test-e2e.db?socket_timeout=30",
  AUTH_SECRET: "clave-e2e-aislada-de-al-menos-32-caracteres",
  STORAGE_DRIVER: "filesystem",
  UPLOADS_ROOT: path.join(raiz, ".e2e-uploads"),
  NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
};

function ejecutar(argumentos) {
  const resultado = spawnSync(process.execPath, argumentos, {
    cwd: raiz,
    env: entorno,
    stdio: "inherit",
  });
  if (resultado.status !== 0) process.exit(resultado.status ?? 1);
}

rmSync(entorno.UPLOADS_ROOT, { recursive: true, force: true });
// En Windows, Prisma no siempre crea un archivo SQLite nuevo desde el proceso
// hijo; precrear exclusivamente la base E2E mantiene el reset determinista.
writeFileSync(path.join(raiz, "prisma", "test-e2e.db"), "");
ejecutar([
  "node_modules/prisma/build/index.js",
  "db",
  "push",
  "--force-reset",
  "--accept-data-loss",
  "--schema=prisma/schema.prisma",
]);
ejecutar(["node_modules/tsx/dist/cli.mjs", "tests/e2e/sembrar.ts"]);

const servidor = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start"], {
  cwd: raiz,
  env: entorno,
  stdio: "inherit",
});

for (const senal of ["SIGINT", "SIGTERM"]) {
  process.on(senal, () => servidor.kill(senal));
}
servidor.on("exit", (codigo) => process.exit(codigo ?? 0));

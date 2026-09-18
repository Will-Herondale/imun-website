/**
 * Playwright backend harness.
 *  - starts the Azurite table emulator on its default ports,
 *  - builds the app once (unless E2E_SKIP_BUILD=1) and serves it on :4100,
 *  - points the app at the emulator via UseDevelopmentStorage=true.
 *
 * The app code path (storage layer, API routes, headers) is identical to
 * production; only the storage backend is the local emulator.
 */
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = process.env.PLAYWRIGHT_APP_PORT ?? "4100";
const TABLE_PORT = 10002;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function waitFor(host, port, tries = 60) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      const sock = net.connect({ host, port });
      sock.once("connect", () => {
        sock.destroy();
        resolve();
      });
      sock.once("error", () => {
        sock.destroy();
        if (n <= 0) reject(new Error(`timeout waiting for ${host}:${port}`));
        else setTimeout(() => attempt(n - 1), 500);
      });
    };
    attempt(tries);
  });
}

async function main() {
  const dataDir = path.join(root, "azurite-data");
  fs.mkdirSync(dataDir, { recursive: true });

  const children = new Set();

  console.log(`> starting Azurite (table service on :${TABLE_PORT})…`);
  const azurite = spawn(
    "npx",
    ["azurite", "--silent", "--location", dataDir, "--skipApiVersionCheck"],
    { cwd: root, stdio: ["ignore", "inherit", "inherit"], shell: process.platform === "win32" }
  );
  azurite.pid && children.add(azurite.pid);

  function killTree(pid) {
    if (!pid) return;
    try {
      if (process.platform === "win32") {
        spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
      } else {
        process.kill(pid, "SIGTERM");
      }
    } catch {
      /* noop */
    }
  }

  const shutdown = () => {
    for (const pid of children) killTree(pid);
    children.clear();
  };
  process.on("exit", shutdown);
  process.on("SIGINT", () => {
    shutdown();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    shutdown();
    process.exit(0);
  });

  await waitFor("127.0.0.1", TABLE_PORT);

  const skipBuild = process.env.E2E_SKIP_BUILD === "1";
  if (!skipBuild) {
    console.log("> building production bundle…");
    const build = spawnSync(
      "npx",
      ["next", "build"],
      { cwd: root, stdio: "inherit", shell: process.platform === "win32" }
    );
    if (build.status !== 0) {
      shutdown();
      process.exit(build.status ?? 1);
    }
  } else {
    console.log("> skipping build (E2E_SKIP_BUILD=1).");
  }

  // Prep the standalone output (the build does not copy these in).
  const standaloneDir = path.join(root, ".next", "standalone");
  const copyDir = (from, to) => {
    if (!fs.existsSync(from)) return;
    fs.rmSync(to, { recursive: true, force: true });
    fs.cpSync(from, to, { recursive: true });
  };
  copyDir(path.join(root, "public"), path.join(standaloneDir, "public"));
  copyDir(
    path.join(root, ".next", "static"),
    path.join(standaloneDir, ".next", "static")
  );

  console.log(`> serving standalone on http://127.0.0.1:${PORT}`);
  const env = {
    ...process.env,
    PORT,
    HOSTNAME: "127.0.0.1",
    NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${PORT}`,
    REGISTRATION_OPEN: "true",
    AZURE_TABLE_CONNECTION_STRING: "UseDevelopmentStorage=true",
    AZURE_TABLE_NAME: "registrations",
    ADMIN_EMAIL: "organiser@iemun.example",
    ADMIN_PASSWORD: "e2e-test-admin-password-0123",
    ADMIN_SESSION_SECRET: "e2e-session-secret-0123456789abcdef0123456789abcdef",
    ALLOW_LOCAL_ADMIN: "true",
    NODE_ENV: "production",
  };
  const server = spawn(
    process.execPath,
    [path.join(standaloneDir, "server.js")],
    { cwd: standaloneDir, stdio: "inherit", shell: false, env }
  );
  server.pid && children.add(server.pid);

  server.once("exit", () => {
    shutdown();
    process.exit(server.exitCode ?? 0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
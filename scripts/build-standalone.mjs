/**
 * Prepares a production standalone bundle in a zip suitable for `az webapp
 * deploy`.
 *
 *   npm run build:standalone
 *
 * Produces ./deploy-artifact/iemun-standalone.zip (gitignored) containing the
 * contents of .next/standalone with public/ and .next/static copied in.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const { ZipArchive } = createRequire(import.meta.url)("archiver");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standalone = path.join(root, ".next", "standalone");
const outDir = path.join(root, "deploy-artifact");
const zipPath = path.join(outDir, "iemun-standalone.zip");

function copyDir(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}

async function main() {
  console.log("> building next (standalone output)…");
  const build = spawnSync("npx", ["next", "build"], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, BUILD_STANDALONE: "true" },
  });
  if (build.status !== 0) {
    console.error("build failed");
    process.exit(build.status ?? 1);
  }

  if (!fs.existsSync(path.join(standalone, "server.js"))) {
    console.error("standalone output missing (is output:'standalone' set?)");
    process.exit(1);
  }

  // Next copies some assets itself; ensure static + public are present.
  copyDir(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"));
  copyDir(path.join(root, "public"), path.join(standalone, "public"));

  fs.mkdirSync(outDir, { recursive: true });
  if (fs.existsSync(zipPath)) fs.rmSync(zipPath);

  console.log("> packaging zip…");
  const output = fs.createWriteStream(zipPath);
  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.pipe(output);
  archive.directory(standalone, false);
  await archive.finalize();

  console.log(`> wrote ${zipPath} (${(fs.statSync(zipPath).size / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
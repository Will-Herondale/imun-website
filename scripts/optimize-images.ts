/**
 * Re-encodes the brand PNGs that are actually served to browsers as WebP, and
 * recompresses the Open Graph PNG (which must stay PNG/JPEG for social
 * crawlers). Run after `process:logo` whenever the brand set is regenerated:
 *
 *   npm run process:logo && npm run optimize:images
 *
 * Emits, next to each source PNG:
 *   - public/assets/brand/iemun-seal.webp
 *   - public/assets/brand/iemun-seal-white.webp
 *   - public/assets/brand/iemun-logo.webp
 * The source PNGs are left untouched (favicons and OG images still use them).
 */
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";

const ROOT = path.resolve(import.meta.dirname, "..");
const BRAND = path.join(ROOT, "public", "assets", "brand");

const targets = ["iemun-seal.png", "iemun-seal-white.png", "iemun-logo.png"];

async function main() {
  for (const file of targets) {
    const src = path.join(BRAND, file);
    if (!fs.existsSync(src)) {
      console.warn(`skip (missing): ${file}`);
      continue;
    }
    const out = src.replace(/\.png$/, ".webp");
    const before = fs.statSync(src).size;
    await sharp(src).webp({ quality: 88, alphaQuality: 92, effort: 6 }).toFile(out);
    const after = fs.statSync(out).size;
    const pct = Math.round((1 - after / before) * 100);
    console.log(`${file} -> ${path.basename(out)}  ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB (-${pct}%)`);
  }

  // Open Graph stays PNG; force a smaller palette-free recompression.
  const og = path.join(BRAND, "iemun-og.png");
  if (fs.existsSync(og)) {
    const before = fs.statSync(og).size;
    const buf = await sharp(og).png({ compressionLevel: 9, palette: true, quality: 90 }).toBuffer();
    fs.writeFileSync(og, buf);
    const after = fs.statSync(og).size;
    const pct = Math.round((1 - after / before) * 100);
    console.log(`iemun-og.png recompressed  ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB (-${pct}%)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

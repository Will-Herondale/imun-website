/**
 * Builds the IMUN brand image set from the supplied institutional seal JPEG.
 *
 * The seal is monochrome navy artwork on a white field, so the outer white is
 * trimmed and the dark ink is converted into a clean alpha mask. That lets us
 * emit both a navy mark (for light surfaces) and a white mark (for the navy
 * header/footer) with true transparency and no halos.
 *
 * Produces:
 *   - public/assets/brand/iemun-seal.png        navy seal, transparent (900px)
 *   - public/assets/brand/iemun-seal-white.png  white seal, transparent (900px)
 *   - public/assets/brand/iemun-logo.png        white seal for dark UI (600px)
 *   - app/icon.png                              navy seal on white (512px)
 *   - app/apple-icon.png                        navy seal on white (180px)
 *   - public/assets/brand/iemun-og.png          Open Graph image (1200x630)
 *
 * Run: npm run process:logo
 * The source file is never modified.
 */
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";

const SRC =
  "C:\\Users\\Ashwath M\\Downloads\\WhatsApp Image 2026-09-18 at 9.04.52 PM.jpeg";

const NAVY = { r: 3, g: 31, b: 78 };
const WHITE = { r: 255, g: 255, b: 255 };
const ROOT = path.resolve(import.meta.dirname, "..");

/** Renders the trimmed seal as a single-colour mark with an alpha mask. */
async function mark(
  size: number,
  color: { r: number; g: number; b: number },
  trimmed: Buffer
): Promise<Buffer> {
  const { data, info } = await sharp(trimmed)
    .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    // White field -> alpha 0; navy ink -> alpha ~255. The 1.12 factor
    // normalises the ink's luminance back to full opacity.
    const a = Math.max(0, Math.min(255, Math.round((255 - data[i]) * 1.12)));
    out[i * 4] = color.r;
    out[i * 4 + 1] = color.g;
    out[i * 4 + 2] = color.b;
    out[i * 4 + 3] = a;
  }

  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  const outDir = path.join(ROOT, "public", "assets", "brand");
  fs.mkdirSync(outDir, { recursive: true });

  const meta = await sharp(SRC).metadata();
  if (!meta.width || !meta.height) throw new Error("Could not read source dimensions");
  console.log(`source: ${meta.width}x${meta.height} ${meta.format}`);

  // Trim the outer white field down to the seal's bounding box.
  const trimmed = await sharp(SRC)
    .trim({ background: { r: 255, g: 255, b: 255 }, threshold: 14 })
    .png()
    .toBuffer();

  const sealNavy = await mark(900, NAVY, trimmed);
  const sealWhite = await mark(900, WHITE, trimmed);
  const logoWhite = await mark(600, WHITE, trimmed);

  fs.writeFileSync(path.join(outDir, "iemun-seal.png"), sealNavy);
  fs.writeFileSync(path.join(outDir, "iemun-seal-white.png"), sealWhite);
  fs.writeFileSync(path.join(outDir, "iemun-logo.png"), logoWhite);
  console.log("iemun-seal.png + iemun-seal-white.png + iemun-logo.png written");

  // ---- App icons: navy seal on a white square ----
  const appDir = path.join(ROOT, "app");
  const iconBase = (size: number) => ({
    create: { width: size, height: size, channels: 4 as const, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  });
  await sharp(iconBase(512))
    .composite([{ input: await sharp(sealNavy).resize(468, 468).toBuffer(), gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(appDir, "icon.png"));
  await sharp(iconBase(180))
    .composite([{ input: await sharp(sealNavy).resize(164, 164).toBuffer(), gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(appDir, "apple-icon.png"));
  console.log("app/icon.png (512) + app/apple-icon.png (180) written");

  // ---- Open Graph image 1200x630 ----
  const OG_W = 1200;
  const OG_H = 630;
  const ogSealSize = 372;
  const ogSeal = await sharp(sealWhite).resize(ogSealSize, ogSealSize).toBuffer();

  const ogBase = Buffer.from(
    `<svg width="${OG_W}" height="${OG_H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${OG_W}" height="${OG_H}" fill="#031f4e"/>
      <g fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1">
        <rect x="40" y="40" width="${OG_W - 80}" height="${OG_H - 80}" rx="10"/>
        <rect x="54" y="54" width="${OG_W - 108}" height="${OG_H - 108}" rx="8"/>
      </g>
      <g fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1">
        <circle cx="300" cy="${OG_H / 2}" r="248"/>
        <circle cx="300" cy="${OG_H / 2}" r="226"/>
      </g>
      <text x="556" y="250" font-family="Arial, Helvetica, sans-serif" font-size="86" font-weight="700" fill="#ffffff" letter-spacing="2">IMUN</text>
      <text x="560" y="304" font-family="Arial, Helvetica, sans-serif" font-size="29" fill="#c2d8fb" letter-spacing="7">MODEL UNITED NATIONS</text>
      <line x1="560" y1="342" x2="1090" y2="342" stroke="rgba(255,255,255,0.22)" stroke-width="1"/>
      <text x="560" y="388" font-family="Arial, Helvetica, sans-serif" font-size="25" fill="#ffffff">Indian MUN · 24–25 October 2026</text>
    </svg>`
  );

  await sharp(ogBase)
    .composite([{ input: ogSeal, left: 114, top: Math.round((OG_H - ogSealSize) / 2) }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, "iemun-og.png"));
  console.log("public/assets/brand/iemun-og.png written (1200x630)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

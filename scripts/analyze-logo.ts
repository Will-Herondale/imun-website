import sharp from "sharp";

const SRC =
  "C:\\Users\\Ashwath M\\OneDrive\\Pictures\\Screenshots 1\\Screenshot 2026-09-18 164823.png";

async function main() {
  const { data, info } = await sharp(SRC)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const px = (x: number, y: number) => {
    const i = (y * width + x) * channels;
    return [data[i], data[i + 1], data[i + 2], channels > 3 ? data[i + 3] : 255];
  };

  const W = 132;
  const H = 34;
  const cellW = width / W;
  const cellH = height / H;
  const classify = (r: number, g: number, b: number, a: number) => {
    if (a < 128) return " ";
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const blueness = b - Math.max(r, g);
    if (lum < 30) return blueness > 5 ? "N" : "K"; // near-black navy vs black
    if (lum < 85) return blueness > 12 ? "n" : "k"; // dark navy vs dark gray
    if (blueness > 25) return "B"; // saturated blue
    if (blueness > 8) return "b"; // mid blue
    if (lum < 190) return "g"; // gray
    if (blueness > 10) return "c"; // light blue (tint)
    return "w"; // white
  };
  const rows: string[] = [];
  for (let j = 0; j < H; j++) {
    let line = "";
    for (let i = 0; i < W; i++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      const x0 = Math.floor(i * cellW), y0 = Math.floor(j * cellH);
      const x1 = Math.max(x0 + 1, Math.floor((i + 1) * cellW));
      const y1 = Math.max(y0 + 1, Math.floor((j + 1) * cellH));
      for (let y = y0; y < y1 && y < height; y += 2)
        for (let x = x0; x < x1 && x < width; x += 2) {
          const c = px(x, y);
          r += c[0]; g += c[1]; b += c[2]; a += c[3]; n++;
        }
      if (!n) { line += " "; continue; }
      line += classify(r / n, g / n, b / n, a / n);
    }
    rows.push(line);
  }
  console.log(rows.join("\n"));
  console.log("Legend: N/n navy-dark B/b blue  K/k black  g gray  c lightblue tint  w white");

  // ---- Isolate strong-blue emblem pixels to locate circular emblem ----
  let minX = width, minY = height, maxX = 0, maxY = 0, count = 0, sx = 0, sy = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const c = px(x, y);
      const blueness = c[2] - Math.max(c[0], c[1]);
      if (c[3] > 128 && blueness > 14 && Math.min(c[0], c[1], c[2]) >= 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        sx += x; sy += y; count++;
      }
    }
  }
  if (count) {
    const cx = sx / count, cy = sy / count;
    console.log(
      `strong-blue emblem pixels=${count} bbox x[${minX},${maxX}] y[${minY},${maxY}] size=${maxX - minX}x${maxY - minY} centroid=(${cx.toFixed(
        1
      )},${cy.toFixed(1)})`
    );
    // radial distribution around centroid to find circle radius
    const radii = new Map<number, number>();
    let maxR = 0;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const c = px(x, y);
        const blueness = c[2] - Math.max(c[0], c[1]);
        if (c[3] > 128 && blueness > 14 && Math.min(c[0], c[1], c[2]) >= 20) {
          const r = Math.round(Math.hypot(x - cx, y - cy));
          radii.set(r, (radii.get(r) ?? 0) + 1);
          if (r > maxR) maxR = r;
        }
      }
    }
    let peakR = 0, peakCount = 0, total = 0;
    for (const [r, n] of radii) { total += n; if (n > peakCount) { peakCount = n; peakR = r; } }
    console.log(`largest radius ${maxR}, peak ring at r=${peakR} (${peakCount}px)`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
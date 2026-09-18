import sharp from "sharp";

(async () => {
  const { data, info } = await sharp("public/assets/brand/iemun-logo.png")
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let transparent = 0;
  let opaque = 0;
  const px = (x: number, y: number) => {
    const i = (y * width + x) * channels;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };
  for (let y = 0; y < height; y += 2)
    for (let x = 0; x < width; x += 2) {
      const c = px(x, y);
      c[3] < 60 ? transparent++ : opaque++;
    }
  console.log("size", width, "x", height, "transparent%", ((transparent / (transparent + opaque)) * 100).toFixed(1));

  const W = 80;
  const H = 18;
  const cellW = width / W;
  const cellH = height / H;
  const classify = (r: number, g: number, b: number, a: number) => {
    if (a < 60) return " ";
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const blueness = b - Math.max(r, g);
    if (lum < 40) return blueness > 5 ? "N" : "K";
    if (lum < 90) return blueness > 12 ? "n" : "k";
    if (blueness > 25) return "B";
    if (blueness > 8) return "b";
    if (lum < 190) return "g";
    if (blueness > 10) return "c";
    return "w";
  };
  const rows: string[] = [];
  for (let j = 0; j < H; j++) {
    let line = "";
    for (let i = 0; i < W; i++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      const x0 = Math.floor(i * cellW);
      const y0 = Math.floor(j * cellH);
      const x1 = Math.max(x0 + 1, Math.floor((i + 1) * cellW));
      const y1 = Math.max(y0 + 1, Math.floor((j + 1) * cellH));
      for (let y = y0; y < y1 && y < height; y += 1)
        for (let x = x0; x < x1 && x < width; x += 1) {
          const c = px(x, y);
          r += c[0]; g += c[1]; b += c[2]; a += c[3]; n++;
        }
      line += classify(r / n, g / n, b / n, a / n);
    }
    rows.push(line);
  }
  console.log(rows.join("\n"));
})();
/**
 * Convert SVG icons to PNG at required sizes.
 * Run: node scripts/generate-icons.mjs
 * Requires: sharp (npm install sharp)
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const iconsDir = join(root, "extension", "icons");

const sizes = [16, 48, 128];

async function main() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.log("sharp not installed. Install with: npm install -g sharp");
    console.log("Falling back to placeholder PNGs...");
    generatePlaceholders();
    return;
  }

  const svgSource = readFileSync(join(iconsDir, "icon128.svg"));

  for (const size of sizes) {
    const png = await sharp(svgSource)
      .resize(size, size)
      .png()
      .toBuffer();
    writeFileSync(join(iconsDir, `icon${size}.png`), png);
    console.log(`Generated icon${size}.png`);
  }
}

function generatePlaceholders() {
  for (const size of sizes) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="${size}" y2="${size}" gradientUnits="userSpaceOnUse">
    <stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#d946ef"/>
  </linearGradient></defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="url(#g)"/>
  <text x="${size / 2}" y="${size * 0.7}" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(size * 0.6)}" font-weight="800" fill="white">P</text>
</svg>`;
    writeFileSync(join(iconsDir, `icon${size}.svg`), svg);
    console.log(`SVG template: icon${size}.svg (convert to PNG manually)`);
  }
}

main().catch(console.error);

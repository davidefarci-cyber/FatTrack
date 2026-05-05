#!/usr/bin/env node
// Ottimizza PNG generati da GPT in WebP per ridurre dimensione bundle
// dell'app. Cancella i PNG originali se la conversione va a buon fine.
//
// Uso:
//   node scripts/exercise-illustrations/optimize.js [<dir>]
//
// Default dir: assets/exercises/verificate
//
// Parametri:
//   - WebP qualità 85 (lossy ma indistinguibile per illustrazioni piatte).
//   - Resize: max 1080 px sul lato lungo (sufficiente per xxxhdpi).
//   - Metadata strippati (-metadata none) per ridurre ulteriormente size.
//
// Richiede: cwebp installato (apt-get install -y webp).

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const QUALITY = 85;
const MAX_DIM = 1080;
const DEFAULT_DIR = path.join(__dirname, '..', '..', 'assets', 'exercises', 'verificate');

function getImageDimensions(pngPath) {
  // Usa identify se disponibile, altrimenti parsa l'header del PNG.
  // I PNG salvano width/height nei byte 16-23 dell'header IHDR.
  const buf = fs.readFileSync(pngPath, { encoding: null }).slice(0, 24);
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  return { w, h };
}

function optimize(pngPath) {
  const dir = path.dirname(pngPath);
  const base = path.basename(pngPath, '.png');
  const webpPath = path.join(dir, `${base}.webp`);

  const { w, h } = getImageDimensions(pngPath);
  const longSide = Math.max(w, h);
  const args = ['-q', String(QUALITY), '-metadata', 'none', '-quiet'];

  if (longSide > MAX_DIM) {
    if (w >= h) {
      args.push('-resize', String(MAX_DIM), '0');
    } else {
      args.push('-resize', '0', String(MAX_DIM));
    }
  }

  args.push(pngPath, '-o', webpPath);
  execFileSync('cwebp', args);

  const pngSize = fs.statSync(pngPath).size;
  const webpSize = fs.statSync(webpPath).size;
  return { pngSize, webpSize, webpPath, w, h };
}

function main() {
  const dir = process.argv[2] || DEFAULT_DIR;
  if (!fs.existsSync(dir)) {
    console.error(`Cartella inesistente: ${dir}`);
    process.exit(1);
  }

  const pngs = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.png'))
    .sort();

  if (pngs.length === 0) {
    console.log(`Nessun PNG da ottimizzare in ${dir}.`);
    return;
  }

  console.log(`Ottimizzazione di ${pngs.length} PNG in ${dir}\n`);
  console.log(
    `${'file'.padEnd(40)} ${'size PNG'.padStart(10)} → ${'WebP'.padStart(10)}  saving`,
  );
  console.log('-'.repeat(80));

  let totalPng = 0;
  let totalWebp = 0;

  for (const f of pngs) {
    const pngPath = path.join(dir, f);
    const { pngSize, webpSize } = optimize(pngPath);
    totalPng += pngSize;
    totalWebp += webpSize;
    const saving = ((1 - webpSize / pngSize) * 100).toFixed(0);
    const pngKb = (pngSize / 1024).toFixed(0);
    const webpKb = (webpSize / 1024).toFixed(0);
    console.log(
      `${f.padEnd(40)} ${(pngKb + ' KB').padStart(10)} → ${(webpKb + ' KB').padStart(10)}  -${saving}%`,
    );
    fs.unlinkSync(pngPath);
  }

  console.log('-'.repeat(80));
  const totalSaving = ((1 - totalWebp / totalPng) * 100).toFixed(0);
  console.log(
    `TOTALE${''.padEnd(34)} ${(((totalPng / 1024 / 1024).toFixed(1)) + ' MB').padStart(10)} → ${(((totalWebp / 1024 / 1024).toFixed(1)) + ' MB').padStart(10)}  -${totalSaving}%`,
  );
}

main();

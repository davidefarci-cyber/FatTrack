#!/usr/bin/env node
// Genera src/utils/exerciseImages.ts dalla manifest.
// Output: mappa name → slug + slug → require statico WebP +
// aspectRatio derivato dalla strategy.
//
// Uso: node scripts/exercise-illustrations/generate-image-map.js

const fs = require('fs');
const path = require('path');

const { MANIFEST } = require('./manifest');

const OUTPUT_PATH = path.join(__dirname, '..', '..', 'src', 'utils', 'exerciseImages.ts');

const ASPECT_RATIO = {
  single: '1', // 1024 x 1024 = 1:1
  dual: '4 / 3', // 1600 x 1200 = 4:3
  triple: '16 / 9', // 1920 x 1080 = 16:9
};

function generate() {
  const lines = [
    '// AUTOGENERATO da scripts/exercise-illustrations/generate-image-map.js',
    '// NON modificare a mano: rilancia lo script dopo aggiornamenti al manifest.',
    '',
    "import type { ImageSourcePropType } from 'react-native';",
    '',
    '// Mappa nome esercizio (esatto come nel seed) → slug del file PNG/WebP.',
    "// Lo slug è la chiave del lookup nella mappa EXERCISE_IMAGES.",
    'const NAME_TO_SLUG: Record<string, string> = {',
  ];

  for (const e of MANIFEST) {
    lines.push(`  ${JSON.stringify(e.name)}: ${JSON.stringify(e.slug)},`);
  }

  lines.push('};');
  lines.push('');
  lines.push('// Mappa slug → require statico del WebP. Metro non supporta require');
  lines.push('// dinamici sui path, quindi serve l\'elenco completo qui.');
  lines.push('const EXERCISE_IMAGES: Record<string, ImageSourcePropType> = {');

  // Path RELATIVO (../../assets/...) e non alias @/. Metro NON risolve gli
  // alias di Babel/TS per il suo asset resolver: usa solo il file system.
  // Stesso pattern di src/utils/sportSounds.ts.
  for (const e of MANIFEST) {
    lines.push(`  ${JSON.stringify(e.slug)}: require('../../assets/exercises/${e.slug}.webp'),`);
  }

  lines.push('};');
  lines.push('');
  lines.push('// Mappa slug → aspectRatio (width / height) per impostare correttamente');
  lines.push('// il box dell\'<Image> senza dover fare load asincrono delle dimensioni.');
  lines.push('// Derivato dalla strategy nel manifest:');
  lines.push('// - single → 1:1 (1024 x 1024)');
  lines.push('// - dual → 4:3 (1600 x 1200, due frame affiancati)');
  lines.push('// - triple → 16:9 (1920 x 1080, tre frame affiancati)');
  lines.push('const EXERCISE_ASPECT_RATIO: Record<string, number> = {');

  for (const e of MANIFEST) {
    lines.push(`  ${JSON.stringify(e.slug)}: ${ASPECT_RATIO[e.strategy]},`);
  }

  lines.push('};');
  lines.push('');
  lines.push('/**');
  lines.push(' * Recupera l\'immagine per un esercizio dato il suo nome.');
  lines.push(' * Il nome deve corrispondere ESATTO a quello in seedExercises.ts.');
  lines.push(' * Ritorna null se non c\'è asset disponibile (fallback graceful).');
  lines.push(' */');
  lines.push('export function getExerciseImage(name: string): ImageSourcePropType | null {');
  lines.push('  const slug = NAME_TO_SLUG[name];');
  lines.push('  if (!slug) return null;');
  lines.push('  return EXERCISE_IMAGES[slug] ?? null;');
  lines.push('}');
  lines.push('');
  lines.push('/**');
  lines.push(' * Aspect ratio dell\'immagine (width / height) per dimensionare il box');
  lines.push(' * correttamente. Default 1 se l\'esercizio non ha asset.');
  lines.push(' */');
  lines.push('export function getExerciseAspectRatio(name: string): number {');
  lines.push('  const slug = NAME_TO_SLUG[name];');
  lines.push('  if (!slug) return 1;');
  lines.push('  return EXERCISE_ASPECT_RATIO[slug] ?? 1;');
  lines.push('}');
  lines.push('');
  lines.push('/**');
  lines.push(' * True se l\'esercizio ha un\'illustrazione disponibile.');
  lines.push(' */');
  lines.push('export function hasExerciseImage(name: string): boolean {');
  lines.push('  return getExerciseImage(name) !== null;');
  lines.push('}');
  lines.push('');

  fs.writeFileSync(OUTPUT_PATH, lines.join('\n'));
  console.log(`Scritto ${OUTPUT_PATH}`);
  console.log(`  ${MANIFEST.length} esercizi mappati`);
}

generate();

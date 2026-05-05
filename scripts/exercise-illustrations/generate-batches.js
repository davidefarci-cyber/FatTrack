#!/usr/bin/env node
// Genera i file batch markdown da incollare in chat GPT separate.
//
// Uso: node scripts/exercise-illustrations/generate-batches.js
//
// Output: `scripts/exercise-illustrations/batches/batch-NN.md` (uno per
// gruppo di esercizi). Ogni batch contiene istruzioni di header per GPT
// (compreso il packaging finale in ZIP con filename corretti) seguite da
// N prompt auto-contenuti, separati visivamente.

const fs = require('fs');
const path = require('path');

const { MANIFEST } = require('./manifest');
const { buildPrompt } = require('./template');

const BATCH_SIZE = 7;
const OUTPUT_DIR = path.join(__dirname, 'batches');

function batchHeader(batchNum, totalBatches, entries) {
  const zipName = `fattrack-exercises-batch-${String(batchNum).padStart(2, '0')}.zip`;
  const filenameList = entries.map((e) => `- ${e.slug}.png`).join('\n');
  return [
    `# BATCH ${String(batchNum).padStart(2, '0')} / ${String(totalBatches).padStart(2, '0')} — illustrazioni esercizi FatTrack`,
    ``,
    `## Istruzioni per la chat GPT`,
    ``,
    `Genera UNA immagine per ognuno dei ${entries.length} prompt elencati sotto. Ogni prompt è auto-contenuto: stile, palette e formato sono ripetuti in ogni blocco. Segui ESATTAMENTE il prompt di ciascuno.`,
    ``,
    `Al termine di tutte le ${entries.length} immagini, raggruppale in un singolo file ZIP chiamato \`${zipName}\` con i PNG nominati esattamente come indicato nel campo "**Nome file**" di ogni blocco. I nomi devono essere:`,
    ``,
    filenameList,
    ``,
    `Niente cartelle interne nello ZIP, file PNG flat alla radice.`,
    ``,
    `## Regole comuni a tutte le immagini di questo batch`,
    ``,
    `- Formato PNG, dimensioni indicate nel singolo prompt.`,
    `- Sfondo bianco puro (#FFFFFF) o trasparente.`,
    `- Palette rigida: #FF7A1A / #D45C00 / #FFE0C8 / #1E2532 / #FFFFFF. Nessun altro colore.`,
    `- NESSUN testo nelle immagini, NESSUNO sfondo scenografico, NESSUNA freccia/etichetta/numero.`,
    `- Stile vettoriale flat moderno, coerente tra tutte le immagini.`,
    ``,
    `---`,
    ``,
  ].join('\n');
}

function batchFooter(batchNum, entries) {
  const zipName = `fattrack-exercises-batch-${String(batchNum).padStart(2, '0')}.zip`;
  return [
    ``,
    `---`,
    ``,
    `## Output finale richiesto`,
    ``,
    `Quando hai completato tutte le ${entries.length} immagini di questo batch, raggruppale in \`${zipName}\` con i nomi file esatti indicati in ciascun blocco. Conferma a fine generazione che ogni filename corrisponde correttamente prima di creare lo ZIP.`,
    ``,
  ].join('\n');
}

function entryBlock(index, entry) {
  const heading = `## ${index}. ${entry.name}`;
  const fileLine = `**Nome file**: \`${entry.slug}.png\``;
  const prompt = buildPrompt(entry);
  return [
    heading,
    ``,
    fileLine,
    ``,
    '```text',
    prompt,
    '```',
    ``,
    `---`,
    ``,
  ].join('\n');
}

function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const totalBatches = Math.ceil(MANIFEST.length / BATCH_SIZE);
  const summary = [];
  summary.push(`Manifest size: ${MANIFEST.length} esercizi`);
  summary.push(`Batch size: ${BATCH_SIZE}`);
  summary.push(`Totale batch: ${totalBatches}`);
  summary.push('');

  for (let i = 0; i < totalBatches; i += 1) {
    const start = i * BATCH_SIZE;
    const slice = MANIFEST.slice(start, start + BATCH_SIZE);
    const batchNum = i + 1;
    const fileName = `batch-${String(batchNum).padStart(2, '0')}.md`;
    const filePath = path.join(OUTPUT_DIR, fileName);

    const parts = [batchHeader(batchNum, totalBatches, slice)];
    slice.forEach((entry, idx) => {
      parts.push(entryBlock(idx + 1, entry));
    });
    parts.push(batchFooter(batchNum, slice));

    fs.writeFileSync(filePath, parts.join(''));
    summary.push(`${fileName}: ${slice.length} esercizi → ${slice.map((e) => e.slug).join(', ')}`);
  }

  // Statistiche di varietà
  const stats = MANIFEST.reduce(
    (acc, e) => {
      acc.strategy[e.strategy] = (acc.strategy[e.strategy] || 0) + 1;
      acc.character[e.character] = (acc.character[e.character] || 0) + 1;
      acc.view[e.view] = (acc.view[e.view] || 0) + 1;
      return acc;
    },
    { strategy: {}, character: {}, view: {} },
  );

  summary.push('');
  summary.push('Distribuzione strategy:', JSON.stringify(stats.strategy));
  summary.push('Distribuzione character:', JSON.stringify(stats.character));
  summary.push('Distribuzione view:', JSON.stringify(stats.view));

  // Slug check (no duplicates, valid characters)
  const seen = new Set();
  const dupes = [];
  const invalid = [];
  for (const e of MANIFEST) {
    if (seen.has(e.slug)) dupes.push(e.slug);
    seen.add(e.slug);
    if (!/^[a-z0-9-]+$/.test(e.slug)) invalid.push(e.slug);
  }
  if (dupes.length > 0) {
    summary.push(`⚠️  SLUG DUPLICATI: ${dupes.join(', ')}`);
  }
  if (invalid.length > 0) {
    summary.push(`⚠️  SLUG NON VALIDI: ${invalid.join(', ')}`);
  }
  if (dupes.length === 0 && invalid.length === 0) {
    summary.push('✓ tutti gli slug sono unici e validi');
  }

  // Nome match (verifica che ogni entry abbia un name che è probabilmente
  // presente nel seed — solo controllo lunghezza non vuota qui).
  const missingName = MANIFEST.filter((e) => !e.name || e.name.length === 0);
  if (missingName.length > 0) {
    summary.push(`⚠️  ENTRY SENZA NAME: ${missingName.length}`);
  } else {
    summary.push('✓ tutte le entry hanno un name');
  }

  console.log(summary.join('\n'));
}

main();

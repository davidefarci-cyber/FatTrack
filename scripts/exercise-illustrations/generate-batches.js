#!/usr/bin/env node
// Genera i file batch markdown da incollare in chat GPT separate.
//
// Uso:
//   node scripts/exercise-illustrations/generate-batches.js
//   node scripts/exercise-illustrations/generate-batches.js --compact
//
// Modalità:
//   - default (full): ogni prompt è auto-contenuto con palette/vincoli/
//     formato ripetuti. Per ChatGPT generico, robusto contro deriva
//     sessione.
//   - --compact: prompt brevi (~10 righe) che omettono i blocchi stile
//     ripetitivi (palette, no-text, sfondo, composizione). Pensato per
//     un Custom GPT che ha già queste specifiche nelle Instructions
//     (vedi scripts/exercise-illustrations/style.md).
//
// Output: `scripts/exercise-illustrations/batches/batch-NN.md` (uno per
// gruppo di esercizi). Ogni batch contiene istruzioni di header per GPT
// (compreso il packaging finale in ZIP con filename corretti) seguite da
// N prompt, separati visivamente.

const fs = require('fs');
const path = require('path');

const { MANIFEST } = require('./manifest');
const { buildPrompt } = require('./template');

const BATCH_SIZE = 7;
// I batch md vivono in assets/exercises/newbatch/ così l'utente li trova
// vicino alle immagini stesse e non sepolti dentro scripts/. La cartella
// è gestita come "lavorazione corrente": contiene i batch da incollare
// in GPT + new_exercises.md (TODO degli esercizi senza immagine), si
// svuota man mano che le immagini vengono prodotte e verificate.
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'assets', 'exercises', 'newbatch');
const ASSETS_DIR = path.join(__dirname, '..', '..', 'assets', 'exercises');
const COMPACT = process.argv.includes('--compact');
// --all: rigenera batch anche per esercizi che hanno gia' un WebP in
// assets/exercises/. Default: filtra (genera solo per i nuovi senza
// illustrazione, coerente col concetto "newbatch = lavorazione corrente").
const RENDER_ALL = process.argv.includes('--all');

function batchHeader(batchNum, totalBatches, entries) {
  const zipName = `fattrack-exercises-batch-${String(batchNum).padStart(2, '0')}.zip`;
  const filenameList = entries.map((e) => `- ${e.slug}.png`).join('\n');
  const modeLabel = COMPACT ? ' (modalità compact)' : '';
  const modeIntro = COMPACT
    ? `Genera UNA immagine per ognuno dei ${entries.length} prompt elencati sotto. Lo stile, palette, formato e vincoli sono già nelle Instructions del Custom GPT — ogni prompt qui ripete SOLO i dati specifici dell'esercizio. Applica le specifiche stile delle Instructions a ogni immagine.`
    : `Genera UNA immagine per ognuno dei ${entries.length} prompt elencati sotto. Ogni prompt è auto-contenuto: stile, palette e formato sono ripetuti in ogni blocco. Segui ESATTAMENTE il prompt di ciascuno.`;
  const commonRules = COMPACT
    ? [
        `## Regole comuni`,
        ``,
        `Tutte le immagini di questo batch seguono le specifiche stile FatTrack già nelle tue Instructions: palette stretta (#FF7A1A / #D45C00 / #FFE0C8 / #1E2532 / #FFFFFF), niente testo nell'immagine, sfondo bianco/trasparente, stile vettoriale flat moderno, formato in base alla strategy.`,
      ]
    : [
        `## Regole comuni a tutte le immagini di questo batch`,
        ``,
        `- Formato PNG, dimensioni indicate nel singolo prompt.`,
        `- Sfondo bianco puro (#FFFFFF) o trasparente.`,
        `- Palette rigida: #FF7A1A / #D45C00 / #FFE0C8 / #1E2532 / #FFFFFF. Nessun altro colore.`,
        `- NESSUN testo nelle immagini, NESSUNO sfondo scenografico, NESSUNA freccia/etichetta/numero.`,
        `- Stile vettoriale flat moderno, coerente tra tutte le immagini.`,
      ];
  return [
    `# BATCH ${String(batchNum).padStart(2, '0')} / ${String(totalBatches).padStart(2, '0')} — illustrazioni esercizi FatTrack${modeLabel}`,
    ``,
    `## Istruzioni per la chat GPT`,
    ``,
    modeIntro,
    ``,
    `Al termine di tutte le ${entries.length} immagini, raggruppale in un singolo file ZIP chiamato \`${zipName}\` con i PNG nominati esattamente come indicato nel campo "**Nome file**" di ogni blocco. I nomi devono essere:`,
    ``,
    filenameList,
    ``,
    `Niente cartelle interne nello ZIP, file PNG flat alla radice.`,
    ``,
    ...commonRules,
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
  const prompt = buildPrompt(entry, { compact: COMPACT });
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

function hasExistingWebp(slug) {
  return fs.existsSync(path.join(ASSETS_DIR, `${slug}.webp`));
}

function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Cancella eventuali batch-*.md preesistenti per evitare residui
  // disallineati col manifest corrente.
  const existing = fs.readdirSync(OUTPUT_DIR).filter((f) => /^batch-\d+\.md$/.test(f));
  existing.forEach((f) => fs.unlinkSync(path.join(OUTPUT_DIR, f)));

  // Filtra le entry: di default genera solo per esercizi senza WebP in
  // assets/exercises/. Con --all, ignora il filtro.
  const entries = RENDER_ALL
    ? MANIFEST
    : MANIFEST.filter((e) => !hasExistingWebp(e.slug));

  if (entries.length === 0) {
    console.log('Nessun esercizio da illustrare:');
    console.log('  - tutti gli esercizi del manifest hanno gia\' il loro WebP in assets/exercises/');
    console.log('  - (per rigenerare comunque tutti i batch, usa --all)');
    return;
  }

  const totalBatches = Math.ceil(entries.length / BATCH_SIZE);
  const summary = [];
  summary.push(`Manifest size: ${MANIFEST.length} esercizi`);
  summary.push(`Da illustrare: ${entries.length} esercizi (${MANIFEST.length - entries.length} gia' fatti, saltati)`);
  if (RENDER_ALL) summary.push('Modalita\': --all (genera anche per esercizi gia\' illustrati)');
  if (COMPACT) summary.push('Modalita\': --compact (prompt minimal per Custom GPT)');
  summary.push(`Batch size: ${BATCH_SIZE}`);
  summary.push(`Totale batch: ${totalBatches}`);
  summary.push('');

  for (let i = 0; i < totalBatches; i += 1) {
    const start = i * BATCH_SIZE;
    const slice = entries.slice(start, start + BATCH_SIZE);
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

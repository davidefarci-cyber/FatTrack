#!/usr/bin/env node
/* eslint-disable */
// Stampa a console il backlog operativo di docs/TODO.md, raggruppato per
// priorità e con i campi salienti di ogni voce. Read-only: niente modifiche
// al file. Invocato da fattrack.bat voce "Mostra TODO".

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TODO_FILE = path.join(ROOT, 'docs', 'TODO.md');

function readTodo() {
  if (!fs.existsSync(TODO_FILE)) {
    console.error(`[!] File non trovato: ${TODO_FILE}`);
    process.exit(1);
  }
  return fs.readFileSync(TODO_FILE, 'utf8').replace(/\r\n/g, '\n');
}

// I 4 gruppi che ci interessano. Ignoro tutto quello che precede il primo
// "## " marker noto (la lunga intro per Claude in cima al file non serve qui).
const KNOWN_GROUPS = [
  { key: 'alta', heading: '🔴 Priorità alta', label: 'Priorità alta' },
  { key: 'media', heading: '🟡 Priorità media', label: 'Priorità media' },
  { key: 'bassa', heading: '🟢 Priorità bassa', label: 'Priorità bassa' },
  { key: 'fatto', heading: '✅ Fatto', label: 'Fatto' },
];

// Parser semplice: split per "## ", scarta la prima parte (preamble), poi
// per ogni gruppo riconosciuto split per "### " e parsa le entry.
function parseTodo(raw) {
  const sections = raw.split(/^## /m).slice(1);
  const groups = {};
  for (const sec of sections) {
    const firstLine = sec.split('\n', 1)[0].trim();
    const group = KNOWN_GROUPS.find((g) => firstLine === g.heading);
    if (!group) continue;
    const body = sec.slice(firstLine.length);
    groups[group.key] = parseEntries(body);
  }
  return groups;
}

function parseEntries(sectionBody) {
  const chunks = sectionBody.split(/^### /m).slice(1);
  const entries = [];
  for (const chunk of chunks) {
    const titleLine = chunk.split('\n', 1)[0].trim();
    // Titoli aperti: "[N] Titolo". Titoli chiusi: "[chiusa] Titolo".
    const m = titleLine.match(/^\[(.+?)\]\s*(.+)$/);
    if (!m) continue;
    const id = m[1];
    const title = m[2];
    const fields = extractFields(chunk);
    entries.push({ id, title, ...fields });
  }
  return entries;
}

function extractFields(chunk) {
  const aperta = matchField(chunk, 'Aperta');
  const chiusa = matchField(chunk, 'Chiusa');
  const area = matchField(chunk, 'Area');
  const dipendeDa = matchField(chunk, 'Dipende da');
  const doneQuando = matchField(chunk, 'Done quando');
  return { aperta, chiusa, area, dipendeDa, doneQuando };
}

function matchField(chunk, name) {
  // Cerca "**Name**: valore" su singola riga. Ritorna stringa o null.
  const re = new RegExp(`\\*\\*${escapeRe(name)}\\*\\*:\\s*([^\\n]+)`);
  const m = chunk.match(re);
  return m ? m[1].trim() : null;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function printGroup(label, entries, opts = {}) {
  const { compactDone = false } = opts;
  const count = entries.length;
  console.log('');
  console.log(`${label} (${count} ${count === 1 ? 'voce' : 'voci'})`);
  console.log('-'.repeat(60));
  if (count === 0) {
    console.log('  (nessuna)');
    return;
  }
  if (compactDone) {
    for (const e of entries) {
      const when = e.chiusa ? ` — chiusa ${e.chiusa}` : '';
      console.log(`  - ${e.title}${when}`);
    }
    return;
  }
  for (const e of entries) {
    console.log('');
    console.log(`  [${e.id}] ${e.title}`);
    const meta = [];
    if (e.aperta) meta.push(`Aperta: ${e.aperta}`);
    if (e.area) meta.push(`Area: ${e.area}`);
    if (e.dipendeDa) meta.push(`Dipende da: ${e.dipendeDa}`);
    if (meta.length) console.log(`      ${meta.join(' · ')}`);
    if (e.doneQuando) {
      // Tronca dopo ~80 char per evitare a capo brutti su CMD 80-col.
      const dq = e.doneQuando.length > 80
        ? e.doneQuando.slice(0, 78) + '...'
        : e.doneQuando;
      console.log(`      Done quando: ${dq}`);
    }
  }
}

function main() {
  const raw = readTodo();
  const groups = parseTodo(raw);

  console.log('============================================================');
  console.log('  FatTrack — Backlog operativo (docs/TODO.md)');
  console.log('============================================================');

  printGroup('🔴 Priorità alta', groups.alta || []);
  printGroup('🟡 Priorità media', groups.media || []);
  printGroup('🟢 Priorità bassa', groups.bassa || []);
  printGroup('✅ Fatto', groups.fatto || [], { compactDone: true });

  console.log('');
  console.log('============================================================');
  console.log('  Per dettagli completi, leggi docs/TODO.md.');
  console.log('  Per aggiungere voci: chiedilo a Claude in sessione');
  console.log('  ("aggiungi al TODO che ...").');
  console.log('============================================================');
}

main();

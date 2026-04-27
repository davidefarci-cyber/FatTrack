#!/usr/bin/env node
/* eslint-disable */
// Bumpa la versione di FatTrack in modo coerente su:
//   - app.json (expo.version, opzionale expo.android.versionCode)
//   - version.json (version, notes)
//
// Uso:
//   node scripts/bump-version.js current
//       -> stampa la versione attuale (da app.json) e basta
//
//   node scripts/bump-version.js next <patch|minor|major>
//       -> stampa cosa diventerebbe la nuova versione, senza scrivere
//
//   node scripts/bump-version.js apply <new-version> [notes-file-path]
//       -> scrive new-version in app.json + version.json,
//          incrementa versionCode di +1, e mette le note (se passate).
//          Stampa la nuova versione su stdout.
//
// Exit codes:
//   0 ok, 1 errore (versione invalida, downgrade, file mancante...)

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APP_JSON = path.join(ROOT, 'app.json');
const VERSION_JSON = path.join(ROOT, 'version.json');

function readJson(file) {
  const raw = fs.readFileSync(file, 'utf8');
  return { raw, data: JSON.parse(raw) };
}

function writeJson(file, data) {
  // Mantengo indentazione a 2 spazi + newline finale, coerente col resto del repo.
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function parseVersion(v) {
  if (typeof v !== 'string') return null;
  const parts = v.split('.');
  if (parts.length < 2 || parts.length > 3) return null;
  const nums = parts.map((p) => parseInt(p, 10));
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;
  while (nums.length < 3) nums.push(0);
  return nums;
}

function compareVersions(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return 0;
}

function bump(parts, kind) {
  const [maj, min, pat] = parts;
  if (kind === 'major') return [maj + 1, 0, 0];
  if (kind === 'minor') return [maj, min + 1, 0];
  if (kind === 'patch') return [maj, min, pat + 1];
  return null;
}

function fmt(parts) {
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

function getCurrentVersion() {
  const { data } = readJson(APP_JSON);
  const v = data?.expo?.version;
  const parsed = parseVersion(v);
  if (!parsed) {
    throw new Error(`expo.version invalida in app.json: ${v}`);
  }
  return { raw: v, parsed, appData: data };
}

function cmdCurrent() {
  const cur = getCurrentVersion();
  process.stdout.write(cur.raw);
}

function cmdNext(kind) {
  const cur = getCurrentVersion();
  const next = bump(cur.parsed, kind);
  if (!next) {
    console.error(`Tipo bump non valido: ${kind}. Usa patch|minor|major.`);
    process.exit(1);
  }
  process.stdout.write(fmt(next));
}

function cmdApply(newVersion, notesFile) {
  const next = parseVersion(newVersion);
  if (!next) {
    console.error(`Versione non valida: ${newVersion}. Formato atteso MAJOR.MINOR.PATCH.`);
    process.exit(1);
  }
  const cur = getCurrentVersion();
  const cmp = compareVersions(next, cur.parsed);
  if (cmp < 0) {
    console.error(
      `Downgrade non permesso: ${fmt(next)} < ${fmt(cur.parsed)}. Aborto.`,
    );
    process.exit(1);
  }
  if (cmp === 0) {
    console.error(
      `La versione richiesta (${fmt(next)}) coincide con quella attuale. Niente da fare.`,
    );
    process.exit(1);
  }

  let notes = '';
  if (notesFile) {
    if (!fs.existsSync(notesFile)) {
      console.error(`File note inesistente: ${notesFile}`);
      process.exit(1);
    }
    notes = fs.readFileSync(notesFile, 'utf8').replace(/\r\n/g, '\n').trim();
  }

  // app.json
  const appData = cur.appData;
  appData.expo.version = fmt(next);
  if (appData.expo.android) {
    const currentCode = Number.isFinite(appData.expo.android.versionCode)
      ? appData.expo.android.versionCode
      : 0;
    appData.expo.android.versionCode = currentCode + 1;
  }
  writeJson(APP_JSON, appData);

  // version.json
  const { data: versionData } = readJson(VERSION_JSON);
  versionData.version = fmt(next);
  versionData.notes = notes;
  // Se manca apk_url usa il default GitHub latest.
  if (typeof versionData.apk_url !== 'string' || !versionData.apk_url) {
    versionData.apk_url =
      'https://github.com/davidefarci-cyber/fattrack/releases/latest/download/fattrack.apk';
  }
  if (typeof versionData.min_supported_version !== 'string') {
    versionData.min_supported_version = fmt(cur.parsed);
  }
  writeJson(VERSION_JSON, versionData);

  process.stdout.write(fmt(next));
}

const [, , cmd, ...rest] = process.argv;
try {
  if (cmd === 'current') cmdCurrent();
  else if (cmd === 'next') cmdNext(rest[0]);
  else if (cmd === 'apply') cmdApply(rest[0], rest[1]);
  else {
    console.error(
      'Uso:\n' +
        '  node scripts/bump-version.js current\n' +
        '  node scripts/bump-version.js next <patch|minor|major>\n' +
        '  node scripts/bump-version.js apply <new-version> [notes-file]\n',
    );
    process.exit(1);
  }
} catch (err) {
  console.error(err.message || String(err));
  process.exit(1);
}

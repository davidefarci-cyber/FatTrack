import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { getDatabase, mealsStore } from '@/database';

// Versione del FORMATO di backup. Bumpare solo quando il formato del file
// JSON cambia in modo incompatibile (es. struttura diversa di `tables`,
// rinomina/eliminazione di tabelle critiche). NON serve bumparla quando si
// aggiungono colonne nullable o tabelle nuove: l'import è best-effort e
// gestisce automaticamente schemi divergenti.
//
// Regola di compatibilità all'import:
//   backup.schemaVersion >  current → rifiutato (è "dal futuro", non lo capiamo)
//   backup.schemaVersion <= current → accettato best-effort
const BACKUP_SCHEMA_VERSION = 1;

// Tabelle attese dall'app corrente, in ordine di import (padri prima dei
// figli per le FK). Backup più vecchi possono averne meno; l'import gestirà
// solo le tabelle che esistono sia nel backup sia nello schema corrente.
const TABLES = [
  // Diet
  'foods',
  'food_servings',
  'meals',
  'favorites',
  'quick_addons',
  'daily_settings',
  'user_profile',
  // Sport (post-Fasi 1-5 + UX Polish A→D2)
  // Ordine padri→figli per FK; active_session esclusa (stato runtime).
  'app_settings',
  'exercises',
  'workouts',
  'workout_exercises',
  'sessions',
  'session_sets',
] as const;

type TableName = (typeof TABLES)[number];

type RawRow = Record<string, unknown>;
type Db = Awaited<ReturnType<typeof getDatabase>>;

export type BackupFile = {
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  tables: Record<string, RawRow[]>;
};

export type ImportReport = {
  imported: Record<string, number>;
  skippedRows: Record<string, number>;
  warnings: string[];
};

export type ImportResult =
  | { kind: 'imported'; report: ImportReport }
  | { kind: 'cancelled' }
  | { kind: 'invalid'; reason: string };

export async function exportBackup(): Promise<
  | { kind: 'shared' }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string }
> {
  try {
    const json = await buildBackupJson();
    const path = `${FileSystem.cacheDirectory}fattrack-backup-${timestampForFilename()}.json`;
    await FileSystem.writeAsStringAsync(path, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) return { kind: 'unavailable' };

    await Sharing.shareAsync(path, {
      mimeType: 'application/json',
      dialogTitle: 'Esporta backup FatTrack',
      UTI: 'public.json',
    });
    return { kind: 'shared' };
  } catch (err) {
    return { kind: 'error', message: errorMessage(err) };
  }
}

export async function importBackup(): Promise<ImportResult> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled) return { kind: 'cancelled' };

  const asset = picked.assets?.[0];
  if (!asset) return { kind: 'invalid', reason: 'Nessun file selezionato' };

  let raw: string;
  try {
    raw = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch (err) {
    return { kind: 'invalid', reason: `Lettura fallita: ${errorMessage(err)}` };
  }

  const parsed = parseBackup(raw);
  if (!parsed.ok) return { kind: 'invalid', reason: parsed.reason };

  try {
    const report = await restoreTables(parsed.value);
    mealsStore.clearCache();
    return { kind: 'imported', report };
  } catch (err) {
    return { kind: 'invalid', reason: `Import fallito: ${errorMessage(err)}` };
  }
}

async function buildBackupJson(): Promise<string> {
  const db = await getDatabase();
  const tables: Record<string, RawRow[]> = {};
  for (const name of TABLES) {
    tables[name] = await db.getAllAsync<RawRow>(`SELECT * FROM ${name}`);
  }
  const payload: BackupFile = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    tables,
  };
  return JSON.stringify(payload, null, 2);
}

async function restoreTables(backup: BackupFile): Promise<ImportReport> {
  const db = await getDatabase();
  const report: ImportReport = {
    imported: {},
    skippedRows: {},
    warnings: [],
  };

  // Mappa una sola volta lo schema corrente per ogni tabella attesa.
  const currentSchema = new Map<TableName, Set<string>>();
  for (const name of TABLES) {
    if (await tableExists(db, name)) {
      currentSchema.set(name, new Set(await getTableColumns(db, name)));
    }
  }

  // Tabelle nel backup non più presenti nel DB: warning, niente blocco.
  for (const name of Object.keys(backup.tables)) {
    if (!(TABLES as readonly string[]).includes(name)) {
      const count = backup.tables[name]?.length ?? 0;
      if (count > 0) {
        report.warnings.push(
          `Tabella "${name}" del backup non è più nello schema corrente: ${count} righe ignorate`,
        );
      }
    }
  }

  // Tabelle nuove introdotte dopo il backup: warning informativo.
  for (const name of TABLES) {
    if (!(name in backup.tables) && currentSchema.has(name)) {
      report.warnings.push(
        `Tabella "${name}" non presente nel backup: rimarrà vuota`,
      );
    }
  }

  // Sanity: deve esserci almeno una tabella in comune con dati, altrimenti
  // l'import azzererebbe il DB senza ripopolarlo.
  const totalRowsInBackup = TABLES.reduce(
    (acc, name) => acc + (backup.tables[name]?.length ?? 0),
    0,
  );
  if (totalRowsInBackup === 0) {
    throw new Error('Il backup non contiene righe importabili per lo schema corrente');
  }

  await db.execAsync('PRAGMA foreign_keys = OFF');
  try {
    await db.execAsync('BEGIN TRANSACTION');
    try {
      // Cancella in ordine inverso (figli prima dei padri).
      for (const name of [...TABLES].reverse()) {
        if (currentSchema.has(name)) {
          await db.execAsync(`DELETE FROM ${name}`);
        }
      }

      for (const name of TABLES) {
        const targetCols = currentSchema.get(name);
        if (!targetCols) continue; // tabella attesa ma non esistente nel DB: edge case
        const rows = backup.tables[name] ?? [];

        let imported = 0;
        let skipped = 0;
        const droppedCols = new Set<string>();

        for (const row of rows) {
          const result = await tryInsertRow(db, name, row, targetCols);
          if (result.ok) {
            imported++;
            for (const c of result.droppedCols) droppedCols.add(c);
          } else {
            skipped++;
          }
        }

        report.imported[name] = imported;
        if (skipped > 0) report.skippedRows[name] = skipped;
        if (droppedCols.size > 0) {
          report.warnings.push(
            `Tabella "${name}": colonne non più presenti, ignorate: ${[...droppedCols].join(', ')}`,
          );
        }
        if (skipped > 0) {
          report.warnings.push(
            `Tabella "${name}": ${skipped} righe non importate (constraint violati)`,
          );
        }
      }

      // Se zero righe sono state importate ovunque, rollback: meglio
      // mantenere lo stato precedente che lasciare il DB vuoto.
      const totalImported = Object.values(report.imported).reduce(
        (a, b) => a + b,
        0,
      );
      if (totalImported === 0) {
        throw new Error('Nessuna riga del backup è risultata importabile');
      }

      await db.execAsync('COMMIT');
    } catch (err) {
      await db.execAsync('ROLLBACK');
      throw err;
    }
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON');
  }

  return report;
}

async function tryInsertRow(
  db: Db,
  table: TableName,
  row: RawRow,
  targetCols: Set<string>,
): Promise<{ ok: true; droppedCols: string[] } | { ok: false }> {
  // Intersection tra colonne presenti nella riga del backup e colonne
  // attuali della tabella. Le colonne del backup non più esistenti vengono
  // segnalate come "dropped". Le colonne attuali non presenti nel backup
  // vengono lasciate al default/NULL del DB (ok finché sono nullable o
  // hanno DEFAULT, come da pattern delle migration esistenti).
  const usable: string[] = [];
  const dropped: string[] = [];
  for (const col of Object.keys(row)) {
    if (targetCols.has(col)) usable.push(col);
    else dropped.push(col);
  }
  if (usable.length === 0) return { ok: false };

  const placeholders = usable.map(() => '?').join(', ');
  const values = usable.map((c) => normalizeValue(row[c]));
  try {
    await db.runAsync(
      `INSERT INTO ${table} (${usable.join(', ')}) VALUES (${placeholders})`,
      ...values,
    );
    return { ok: true, droppedCols: dropped };
  } catch {
    return { ok: false };
  }
}

async function tableExists(db: Db, table: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    table,
  );
  return !!row;
}

async function getTableColumns(db: Db, table: string): Promise<string[]> {
  // PRAGMA non supporta i bind parameters: il nome arriva dalla nostra
  // costante TABLES, quindi è sicuro per costruzione.
  const rows = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${table})`,
  );
  return rows.map((r) => r.name);
}

function normalizeValue(v: unknown): string | number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' || typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return String(v);
}

function parseBackup(
  raw: string,
):
  | { ok: true; value: BackupFile }
  | { ok: false; reason: string } {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'File non è un JSON valido' };
  }
  if (!json || typeof json !== 'object') {
    return { ok: false, reason: 'Formato non riconosciuto' };
  }
  const obj = json as Partial<BackupFile>;
  if (typeof obj.schemaVersion !== 'number') {
    return { ok: false, reason: 'Manca schemaVersion' };
  }
  if (obj.schemaVersion > BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      reason: `Backup di versione futura (${obj.schemaVersion}); aggiorna l'app prima di importarlo`,
    };
  }
  if (!obj.tables || typeof obj.tables !== 'object') {
    return { ok: false, reason: 'Manca il campo tables' };
  }
  // Normalizza: ogni tabella attesa diventa array (anche vuoto se mancante).
  // Tabelle extra (vecchie/sconosciute) restano in `tables` per il warning.
  const normalized: Record<string, RawRow[]> = {};
  for (const [name, value] of Object.entries(obj.tables)) {
    if (Array.isArray(value)) normalized[name] = value as RawRow[];
  }
  return {
    ok: true,
    value: {
      schemaVersion: obj.schemaVersion,
      exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : '',
      appVersion: typeof obj.appVersion === 'string' ? obj.appVersion : 'unknown',
      tables: normalized,
    },
  };
}

function timestampForFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

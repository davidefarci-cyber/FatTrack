import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { getDatabase, mealsStore } from '@/database';

// Versione dello schema serializzato. Bumpare quando l'insieme di tabelle
// o le loro colonne cambiano in modo non retro-compatibile. L'import
// rifiuta backup con `schemaVersion` diversa da quella corrente per
// evitare di reidratare un DB con dati incoerenti.
const BACKUP_SCHEMA_VERSION = 1;

// Ordine d'importanza per il restore: prima le tabelle "padre" (foods),
// poi quelle che hanno foreign key (food_servings → foods, meals → foods).
// Le altre sono indipendenti.
const TABLES = [
  'foods',
  'food_servings',
  'meals',
  'favorites',
  'quick_addons',
  'daily_settings',
  'user_profile',
] as const;

type TableName = (typeof TABLES)[number];

type RawRow = Record<string, unknown>;

export type BackupFile = {
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  tables: Record<TableName, RawRow[]>;
};

export type ImportResult =
  | { kind: 'imported'; counts: Record<TableName, number> }
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
    const counts = await restoreTables(parsed.value.tables);
    mealsStore.clearCache();
    return { kind: 'imported', counts };
  } catch (err) {
    return { kind: 'invalid', reason: `Import fallito: ${errorMessage(err)}` };
  }
}

async function buildBackupJson(): Promise<string> {
  const db = await getDatabase();
  const tables = {} as Record<TableName, RawRow[]>;
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

async function restoreTables(
  tables: Record<TableName, RawRow[]>,
): Promise<Record<TableName, number>> {
  const db = await getDatabase();
  const counts = {} as Record<TableName, number>;

  // Disabilita le FK durante il restore: importiamo in ordine ma le righe
  // esistenti vanno cancellate prima delle nuove e con FK attive il DELETE
  // sui foods cascaderebbe sulle food_servings appena re-inserite.
  await db.execAsync('PRAGMA foreign_keys = OFF');
  try {
    await db.execAsync('BEGIN TRANSACTION');
    try {
      // Pulisci in ordine inverso (figli prima dei padri).
      for (const name of [...TABLES].reverse()) {
        await db.execAsync(`DELETE FROM ${name}`);
      }

      for (const name of TABLES) {
        const rows = tables[name] ?? [];
        for (const row of rows) {
          await insertRow(db, name, row);
        }
        counts[name] = rows.length;
      }

      await db.execAsync('COMMIT');
    } catch (err) {
      await db.execAsync('ROLLBACK');
      throw err;
    }
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON');
  }

  return counts;
}

async function insertRow(
  db: Awaited<ReturnType<typeof getDatabase>>,
  table: TableName,
  row: RawRow,
): Promise<void> {
  const columns = Object.keys(row);
  if (columns.length === 0) return;
  const placeholders = columns.map(() => '?').join(', ');
  const values = columns.map((c) => normalizeValue(row[c]));
  await db.runAsync(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
    ...values,
  );
}

function normalizeValue(v: unknown): string | number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' || typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  // Fallback per tipi inattesi: serializzazione testuale.
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
  if (obj.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      reason: `Versione backup non supportata (trovata ${obj.schemaVersion}, attesa ${BACKUP_SCHEMA_VERSION})`,
    };
  }
  if (!obj.tables || typeof obj.tables !== 'object') {
    return { ok: false, reason: 'Manca il campo tables' };
  }
  for (const name of TABLES) {
    const rows = (obj.tables as Record<string, unknown>)[name];
    if (!Array.isArray(rows)) {
      return { ok: false, reason: `Tabella mancante o invalida: ${name}` };
    }
  }
  return { ok: true, value: obj as BackupFile };
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

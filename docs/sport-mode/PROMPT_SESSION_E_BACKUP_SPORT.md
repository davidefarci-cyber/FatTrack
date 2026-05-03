# Sport — Sessione E (TODO [14] + [11]: backup/restore include tabelle sport)

## Pre-requisiti (verifica prima di lanciare)

- `main` aggiornato post-merge D + D2 (PR #67 + #69) e cleanup.
- Sessione **parallelizzabile** con F: tocca solo
  `src/utils/dbBackup.ts`, zero conflitti con
  `src/database/seedExercises.ts` (touched solo da F).
- `npm ci` + `npm run typecheck` puliti.

## Branch da creare

`claude/sport-backup-tables-<rand>` (suffisso random 5 char).

## Scope

Estende l'array `TABLES` in `src/utils/dbBackup.ts` per includere
le 6 tabelle sport rilevanti per il backup:

| # | Tabella | FK out | Note |
| --- | --- | --- | --- |
| 1 | `app_settings` | — | Singleton (mode/sportModeSeen/weeklyTarget/tabata_*/hapticEnabled/spotifyPlaylistUri). |
| 2 | `exercises` | — | Libreria. `guide_steps` è JSON-string (gestito già AS-IS dal layer esistente). |
| 3 | `workouts` | — | Schede preset + custom. |
| 4 | `workout_exercises` | → `workouts`, `exercises` | Relazione N:M con `position` ordinata. |
| 5 | `sessions` | → `workouts` (nullable) | Sessioni storiche. |
| 6 | `session_sets` | → `sessions`, `exercises` | Set registrati. |

**`active_session` ESCLUSA**: è stato runtime (singleton, una
sessione attiva alla volta), il restore di un backup non deve
ripristinare una "sessione live in corso" che non lo è più.

Effort stimato: S-M (~1-2h).

**Bonus al merge**: chiude formalmente anche TODO **[11]** (la
base era già implementata pre-sport, [14] completa il lavoro).

---

## Prompt da incollare

````
Sei in /home/user/FatTrack su branch main aggiornato.

Sessione operaia per TODO [14] (+ chiude [11] al merge): estendi
backup/restore di FatTrack per includere le 6 tabelle sport.
Tocca SOLO `src/utils/dbBackup.ts`. Sessione parallela ad F
(seedExercises.ts), zero rischio conflict.

PRIMA DI INIZIARE leggi nell'ordine:
1. CLAUDE.md (vincoli generali).
2. `src/utils/dbBackup.ts` per intero (350 righe). Capisci:
   - Array `TABLES` (linee 22-30): lista hardcoded delle tabelle
     da esportare/importare, in ordine padri→figli per FK.
   - `BACKUP_SCHEMA_VERSION = 1` (linea 17). LEGGI ATTENTAMENTE
     il commento alle linee 8-15: spiega esplicitamente che NON
     serve bumparla quando si aggiungono solo tabelle nuove
     (l'import è già best-effort e gestisce schemi divergenti).
   - `buildBackupJson()` (linee 113-126): SELECT * FROM ogni
     tabella, salva in `payload.tables[name]` come array di
     RawRow. Niente trasformazione speciale per JSON-serialized
     fields (es. `favorites.items`, `exercises.guide_steps`):
     SQLite restituisce stringhe AS-IS, vengono salvate AS-IS,
     ricaricate AS-IS via `tryInsertRow`. Gestione invariata.
   - `restoreTables()` (linee 128-239): introspection schema via
     `PRAGMA table_info`, intersection colonne backup vs DB,
     `DELETE FROM` in ordine inverso (figli prima), poi
     `INSERT INTO` in ordine normale (padri prima). Tutto in
     transazione con `PRAGMA foreign_keys = OFF` durante.
3. `src/database/db.ts` per le `CREATE TABLE` delle 7 tabelle
   sport (cerca `CREATE TABLE IF NOT EXISTS app_settings` e
   successive ai bordi delle linee 118-200). Verifica le FK
   per costruire l'ordine corretto in `TABLES`.

API e vincoli (NON cambiare):
- Pattern di backup invariato: solo l'array `TABLES` cambia.
- Nessun cambio a `BACKUP_SCHEMA_VERSION` (resta a 1) — vedi
  motivazione sotto in step E1.
- Nessuna nuova dipendenza, nessun nuovo file.
- `active_session` esclusa per design.

Crea il branch:
```
git checkout -b claude/sport-backup-tables-<rand>
```

---

## Step E1 — Estendi TABLES con le 6 tabelle sport

File: `src/utils/dbBackup.ts`

Sostituisci l'array `TABLES` (linee 22-30) con la versione
estesa, separando le sezioni con un commento di blocco per
leggibilità:

```ts
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
```

VERIFICA L'ORDINE:
- `app_settings` standalone, no FK out.
- `exercises` standalone (referenziato da workout_exercises e
  session_sets).
- `workouts` standalone (referenziato da workout_exercises e
  potenzialmente sessions — leggi schema).
- `workout_exercises` → richiede workouts + exercises già
  inseriti.
- `sessions` → potenziale FK a workouts (se schema lo prevede,
  comunque dopo workouts non sbaglia mai).
- `session_sets` → richiede sessions + exercises.

Il pattern esistente di `restoreTables` cancella in ordine
inverso (`[...TABLES].reverse()`) e poi inserisce in ordine
normale, quindi questa lista è giusta sia per export sia per
import.

NON bumpare `BACKUP_SCHEMA_VERSION`. Il commento alle linee 8-15
del file dice testualmente:
> NON serve bumparla quando si aggiungono colonne nullable o
> tabelle nuove: l'import è best-effort e gestisce automaticamente
> schemi divergenti.

Concretamente:
- Backup v1 prodotto da app pre-sport: contiene solo le 7 tabelle
  diet. All'import sull'app aggiornata, le 6 tabelle sport non
  presenti nel backup vengono trattate come "Tabella X non
  presente nel backup: rimarrà vuota" (warning informativo, già
  gestito alle linee 157-163). Nessun blocco.
- Backup v1 prodotto dall'app aggiornata post-questo-merge:
  contiene tutte le 13 tabelle. Importato in app vecchia
  pre-sport: le 6 tabelle sport vengono trattate come "Tabella
  non più nello schema corrente: N righe ignorate" (warning,
  già gestito alle linee 144-154). Nessun blocco.

Se in futuro cambia il FORMATO del JSON (rinomina `tables` o
struttura di `RawRow`), allora si bumpa. Ora no.

Commit suggerito:
`feat(sport): backup include le 6 tabelle sport (mantieni schema v1)`

---

## Step E2 — Round-trip test manuale documentato

NON serve scrivere codice di test (l'app non ha test runner
configurato). Ma documenta nel commit message del passo E1
(oppure in un commit separato se preferisci) che hai
verificato manualmente o ragionato sul round-trip:

1. **Export**: `SettingsScreen` → "Esporta backup" → JSON
   contiene tutte le 13 tabelle sotto `tables.<nome>`. Per
   ognuna, array di righe con tutte le colonne dello schema.
2. **Reset**: cancellare il DB (Settings → Test → "Reset DB" se
   esposto, oppure manualmente via shell o reinstall app).
3. **Import**: `SettingsScreen` → "Importa backup" → seleziona
   il JSON esportato → conferma sostituzione.
4. **Verifica preservazione**:
   - Modalità app (`appMode` da `app_settings`) ripristinata
     (apre in sport o diet a seconda).
   - `weeklyTargetDays` ripristinato (visibile in
     SportSettings).
   - Config Tabata (`tabata_work_sec/rest_sec/rounds`)
     ripristinata (apri tab Tabata, vedi i valori configurati).
   - Schede personali (custom workouts) presenti (tab Schede).
   - Sessioni storiche (tab Storico) presenti con set
     registrati.
   - Esercizi: la libreria seedata viene
     auto-riseminata da `seedExercisesIfEmpty`, ma eventuali
     esercizi custom utente futuri (oggi nessuno) sarebbero
     preservati dal backup.
   - Quick addons / preferiti / pasti / profilo diet:
     preservati (questo è già stato testato dalla Fase 11
     originaria).

Smoke test minimo (verifica solo la non-regressione):
- `npm run typecheck` deve passare pulito.
- `grep "sessions\|session_sets\|workout_exercises" src/utils/dbBackup.ts`
  deve mostrare le tabelle elencate in `TABLES`.

---

## Vincoli operativi

- **No nuove librerie**.
- **No PR**. Push del branch + stop.
- **No git push --force**, no hook-skip.
- **No touch al codice fuori da dbBackup.ts**. Niente cambi a
  `db.ts`, niente migration, niente modifica del backup
  layer / handler nei Settings.
- **No bump di `BACKUP_SCHEMA_VERSION`** (resta a 1) — motivato
  dal commento esistente del file. Se lo bumpi devi anche
  aggiornare il commento, ma è scope creep evitabile.
- **No estensione del backup ad `active_session`** — esclusa per
  design (stato runtime).

## Smoke test (verifica manuale)

1. **Typecheck pulito**: `npm run typecheck`.
2. **TABLES contiene 13 voci**: `grep -c "^  '" src/utils/dbBackup.ts`
   deve restituire `13` (oppure conta visivamente nell'array).
3. **Ordine FK preservato**: nell'array, `app_settings` viene
   prima di `workouts`, `workouts` prima di `workout_exercises`,
   `sessions` prima di `session_sets`, `exercises` prima di
   `workout_exercises` e di `session_sets`.
4. **Round-trip manuale** (lascia all'utente per testare su
   device): export → reset DB → import → preservazione.

## Note finali per la sessione operaia

- Effort stimato: ~1-2h. Più tempo a leggere/capire il layer
  esistente che a modificarlo (in pratica è un single-line edit
  sull'array TABLES + un commit message ben scritto).
- Commit unico va benissimo (è un solo edit di poche righe).
- Push del branch con `git push -u origin <branch>` (retry su
  errori network, max 4 tentativi con backoff esponenziale).
- Niente PR (l'utente la crea da sé).
- Trailer commit standard: `https://claude.ai/code/session_<id>`.

Procedi.
````

---

## Note operative per chi avvia la sessione

- Tempo atteso: ~1-2h.
- Branch dedicato: `claude/sport-backup-tables-<rand>`.
- **Parallelizzabile** con F: zero conflitti di file. Possono
  partire in qualsiasi ordine o in contemporanea.
- A merge avvenuto, l'orchestratore:
  - sposta TODO [14] in "✅ Fatto" con data chiusura.
  - sposta TODO [11] in "✅ Fatto" con data chiusura (la base
    era già implementata, [14] completa il lavoro — vedi nota
    §4.1 storica del handoff).
  - aggiorna `docs/ORCHESTRATOR_HANDOFF.md` §6.2 con la riga E.
  - cancella questo file `PROMPT_SESSION_E_BACKUP_SPORT.md`
    nello stesso commit.
  - aggiorna §9 (E ✅).

## Cosa NON includere (scope creep prevention)

- ❌ Bump `BACKUP_SCHEMA_VERSION` (resta a 1, motivato dal
  commento del file).
- ❌ `active_session` nel backup (stato runtime).
- ❌ Migrazione DB / nuove colonne / nuove tabelle.
- ❌ Modifiche al UI di SettingsScreen ("Esporta backup" /
  "Importa backup" già wired).
- ❌ Nuove dipendenze.
- ❌ Refactor del layer (factory, DI, ecc.). L'edit è
  intenzionalmente minimale.
- ❌ Test automatici (l'app non ha test runner; il round-trip si
  verifica manualmente sul device).
- ❌ Aggiungere voci TODO nuove. [14] e [11] vengono chiuse al
  merge dall'orchestratore.

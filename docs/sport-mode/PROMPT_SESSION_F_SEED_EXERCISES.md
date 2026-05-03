# Sport — Sessione F (TODO [32]: +25 esercizi curati al seed)

## Pre-requisiti (verifica prima di lanciare)

- `main` aggiornato. Sessione **parallelizzabile**: tocca solo
  `src/database/seedExercises.ts`, zero conflitti con D2 (Tabata
  + RestTimer) o E (dbBackup). Può partire in qualsiasi momento
  dopo D, anche prima di E o in contemporanea a D2.
- `npm ci` + `npm run typecheck` puliti.

## Branch da creare

`claude/sport-seed-extra-exercises-<rand>` (suffisso random 5 char).

## Scope

Aggiungere 25 esercizi curati a `SEED_EXERCISES` in
`src/database/seedExercises.ts`. Top-up idempotente esistente
(`seedExercisesIfEmpty` linee 691-714) li redistribuirà
automaticamente agli utenti già installati al prossimo avvio
tramite `INSERT OR IGNORE INTO exercises`.

**Lista già curata dall'orchestratore** (vedi sotto). La worker
NON deve scegliere quali esercizi aggiungere — quello è già
deciso. La worker scrive `description` (1 frase chiara, italiano)
e `guideSteps` (3-5 punti pratici, italiano) per ognuno,
seguendo lo stile dei 40 esercizi esistenti.

Effort stimato: M (~2-3h, principalmente scrittura
description/guideSteps).

---

## Prompt da incollare

````
Sei in /home/user/FatTrack su branch main aggiornato.

Sessione operaia per TODO [32]: +25 esercizi curati al seed
sport. Sessione parallela, autonoma. Tocca SOLO
`src/database/seedExercises.ts`. Niente conflitti con D2 / E.

PRIMA DI INIZIARE leggi nell'ordine:
1. CLAUDE.md (italiano UI, stile commenti, no nuove librerie).
2. `src/database/seedExercises.ts` per intero (40 esercizi
   esistenti + tipo `SeedExercise` + funzione
   `seedExercisesIfEmpty` + helper `insertExercise`).
3. `src/database/exercisesDB.ts` per il tipo `ExerciseLevel`.

API e moduli (NON cambiare):
- Tipo `SeedExercise` definito alle linee 15-24.
- `SEED_EXERCISES` array da estendere (linee 26-668 ca.).
- `seedExercisesIfEmpty` (linee 691-714) gestisce sia first-seed
  (DB vuoto, INSERT INTO) sia top-up idempotente (DB esistente,
  INSERT OR IGNORE su `exercises.name UNIQUE`).
- Pattern di un esercizio (esempio "Squat", linee 28-42):
  ```ts
  {
    name: 'Squat',
    muscleGroup: 'Gambe',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 5,
    description: 'Squat a corpo libero per quadricipiti, glutei e core.',
    guideSteps: [
      'Piedi alla larghezza delle spalle, punte leggermente in fuori.',
      'Scendi piegando le ginocchia, mantenendo la schiena dritta.',
      'Fermati quando le cosce sono parallele al pavimento.',
      'Risali spingendo dai talloni fino alla posizione iniziale.',
    ],
    videoUrl: null,
  },
  ```

Crea il branch:
```
git checkout -b claude/sport-seed-extra-exercises-<rand>
```

---

## Step F1 — Aggiungi i 25 esercizi a SEED_EXERCISES

File: `src/database/seedExercises.ts`

Appendi i 25 esercizi sotto, **in fondo all'array
`SEED_EXERCISES`** (subito prima della parentesi `]` di chiusura
alla linea ~668). NON modificare i 40 esistenti né il loro
ordine. Mantieni i commenti di sezione (`// ─── CATEGORIA ───`)
per i nuovi blocchi.

Per ogni esercizio:
- I campi **metadata** (name, muscleGroup, equipment, level, met)
  sono prescritti — usali esattamente come sotto.
- I campi **description** (1 frase) e **guideSteps** (3-5 punti)
  vanno scritti dalla worker in italiano, con lo stesso stile
  asciutto e pratico dei 40 esistenti.
- `videoUrl: null` per tutti (link curati arriveranno in
  TODO [18] futuro, non scope qui).

Usa l'ordine sotto. I `met` proposti sono basati sul Compendium
di Ainsworth — sentiti libero di aggiustare di ±1 se hai
ragionevole motivo (ma documenta in commit message se lo fai).

### Schiena / Dorsali (5)

1. **Superman**
   - muscleGroup: `Schiena`
   - equipment: `Corpo libero`
   - level: `principiante`
   - met: `3`

2. **Reverse snow angel**
   - muscleGroup: `Schiena`
   - equipment: `Corpo libero`
   - level: `principiante`
   - met: `3`

3. **Rematore con bottiglie**
   - muscleGroup: `Schiena`
   - equipment: `Bottiglie d'acqua`
   - level: `intermedio`
   - met: `5`

4. **Pull-apart con elastico**
   - muscleGroup: `Schiena alta`
   - equipment: `Elastico`
   - level: `principiante`
   - met: `4`

5. **Trazioni assistite con elastico**
   - muscleGroup: `Schiena`
   - equipment: `Elastico + sbarra`
   - level: `intermedio`
   - met: `8`

### Bicipiti (2)

6. **Curl con bottiglie**
   - muscleGroup: `Bicipiti`
   - equipment: `Bottiglie d'acqua`
   - level: `principiante`
   - met: `4`

7. **Curl isometrico con asciugamano**
   - muscleGroup: `Bicipiti`
   - equipment: `Asciugamano`
   - level: `principiante`
   - met: `3`

### Spalle (2)

8. **Shoulder taps**
   - muscleGroup: `Spalle`
   - equipment: `Corpo libero`
   - level: `principiante`
   - met: `4`

9. **Y-T-W prone**
   - muscleGroup: `Spalle`
   - equipment: `Corpo libero`
   - level: `principiante`
   - met: `3`

### Glutei (3)

10. **Clamshell**
    - muscleGroup: `Glutei`
    - equipment: `Corpo libero`
    - level: `principiante`
    - met: `3`

11. **Donkey kick**
    - muscleGroup: `Glutei`
    - equipment: `Corpo libero`
    - level: `principiante`
    - met: `3`

12. **Fire hydrant**
    - muscleGroup: `Glutei`
    - equipment: `Corpo libero`
    - level: `principiante`
    - met: `3`

### Gambe varianti (3)

13. **Lateral lunge**
    - muscleGroup: `Gambe`
    - equipment: `Corpo libero`
    - level: `principiante`
    - met: `5`

14. **Cossack squat**
    - muscleGroup: `Gambe`
    - equipment: `Corpo libero`
    - level: `intermedio`
    - met: `5`

15. **Goblet squat con bottiglia**
    - muscleGroup: `Gambe`
    - equipment: `Bottiglie d'acqua`
    - level: `intermedio`
    - met: `6`

### Stacchi varianti (2)

16. **Romanian deadlift con bottiglie**
    - muscleGroup: `Glutei/Femorali`
    - equipment: `Bottiglie d'acqua`
    - level: `intermedio`
    - met: `5`

17. **Good morning**
    - muscleGroup: `Glutei/Femorali`
    - equipment: `Corpo libero`
    - level: `principiante`
    - met: `4`

### Pliometria (2)

18. **Tuck jump**
    - muscleGroup: `Cardio`
    - equipment: `Corpo libero`
    - level: `intermedio`
    - met: `8`

19. **Broad jump**
    - muscleGroup: `Gambe/Cardio`
    - equipment: `Corpo libero`
    - level: `intermedio`
    - met: `7`

### Esercizi seduti (3)

20. **Marcia da seduti**
    - muscleGroup: `Cardio`
    - equipment: `Sedia`
    - level: `principiante`
    - met: `3`

21. **Alzata gambe da seduti**
    - muscleGroup: `Gambe`
    - equipment: `Sedia`
    - level: `principiante`
    - met: `3`

22. **Twist da seduti**
    - muscleGroup: `Core obliqui`
    - equipment: `Sedia`
    - level: `principiante`
    - met: `3`

### Mobilità (3)

23. **Leg swings**
    - muscleGroup: `Mobilità anche`
    - equipment: `Corpo libero`
    - level: `principiante`
    - met: `3`

24. **Wrist circles**
    - muscleGroup: `Mobilità polsi`
    - equipment: `Corpo libero`
    - level: `principiante`
    - met: `2`

25. **Ankle circles**
    - muscleGroup: `Mobilità caviglie`
    - equipment: `Corpo libero`
    - level: `principiante`
    - met: `2`

---

## Vincoli operativi

- **Italiano** in description + guideSteps. Tono asciutto,
  imperativo (es. "Piega le ginocchia", non "Si piegano le
  ginocchia").
- **GuideSteps**: 3-5 punti per esercizio. Pattern setup → fase
  attiva → respirazione/contrazione → ritorno. NON ripetere il
  nome dell'esercizio dentro guideSteps (è già in `name`).
- **Description**: 1 frase, max ~80 caratteri. Indica
  muscoli/scopo principali + caratteristica distintiva (es.
  "isometrico", "monopodalico", "con appoggio").
- **Stile coerente con i 40 esistenti**: rileggine almeno 5-6 di
  vari muscleGroup prima di scrivere i nuovi, per allinearti al
  registro.
- **Equipment nuovi accettati**: `Bottiglie d'acqua`, `Elastico`,
  `Elastico + sbarra`, `Asciugamano`, `Sedia`. La UI di filtri
  in `ExercisesScreen` li raccoglie dinamicamente
  (`equipmentOptions` riga 107 — `set.add(ex.equipment)`),
  appariranno automaticamente nel BottomSheet filtri senza
  modifiche.
- **MuscleGroup nuovi accettati**: `Schiena`, `Schiena alta`,
  `Bicipiti`, `Glutei/Femorali`, `Mobilità polsi`, `Mobilità
  caviglie`. Stessa cosa: la SectionList di `ExercisesScreen`
  (post-PR #59 commit `0024131`) raggruppa dinamicamente,
  nuove sezioni appaiono automaticamente.
- **Niente nuove dipendenze**, niente touch ad altri file
  (esercizi, UI, DB layer, schema, migration).
- **No PR**. Push del branch + stop.
- **No git push --force**, no hook-skip.
- **Non riordinare** i 40 esercizi esistenti — appendi soltanto
  in fondo all'array.

## Smoke test

1. **Typecheck pulito**: `npm run typecheck`.
2. **Lint pulito**: `npm run lint` (se passa, bene; se ci sono
   warning preesistenti non correlati, ignorali).
3. **Conteggio finale**: dopo l'edit, l'array `SEED_EXERCISES`
   ha esattamente **65 voci** (40 + 25). Verifica con
   `grep -c "^    name:" src/database/seedExercises.ts` (deve
   rispondere 65).
4. **Nomi unici**: `grep "^    name:" src/database/seedExercises.ts | sort | uniq -d`
   deve essere vuoto (zero duplicati).
5. **Avvio app + verifica visiva** (manuale, lascia all'utente):
   tab Esercizi → scorri → trova i 25 nuovi raggruppati per
   muscleGroup (Schiena, Schiena alta, Bicipiti, Glutei,
   Glutei/Femorali, Spalle, Gambe, Cardio, Mobilità anche,
   Mobilità polsi, Mobilità caviglie, Core obliqui).
   I filtri equipment includono `Bottiglie d'acqua`, `Elastico`,
   `Elastico + sbarra`, `Asciugamano`, `Sedia`.

## Note finali per la sessione operaia

- Effort stimato: ~2-3h. Principalmente scrittura.
- Commit incrementali per categoria (es. uno per Schiena, uno
  per Glutei, ecc.) o un commit unico se preferisci — la
  granularità non è critica perché tocca un solo file.
- Push del branch con `git push -u origin <branch>` (retry su
  errori network, max 4 tentativi con backoff esponenziale).
- Niente PR (l'utente la crea da sé).
- Trailer commit standard: `https://claude.ai/code/session_<id>`.

Procedi.
````

---

## Note operative per chi avvia la sessione

- Tempo atteso: ~2-3h.
- Branch dedicato: `claude/sport-seed-extra-exercises-<rand>`.
- **Parallelizzabile**: tocca solo `seedExercises.ts`, zero
  rischio di merge conflict con sessioni in corso (D2, E).
- A merge avvenuto, l'orchestratore:
  - sposta TODO [32] in "✅ Fatto" con data chiusura.
  - aggiorna `docs/ORCHESTRATOR_HANDOFF.md` §6.2 con la riga F.
  - cancella questo file `PROMPT_SESSION_F_SEED_EXERCISES.md`
    nello stesso commit.
  - aggiorna §9 (F ✅).
  - valuta se [19] (DB esterno completo) può essere chiusa come
    "rimandata indefinitamente" ora che la libreria ha 65
    esercizi.

## Cosa NON includere (scope creep prevention)

- ❌ Modifica dei 40 esercizi esistenti (description, guideSteps,
  met, muscleGroup, ecc.). Solo append.
- ❌ Aggiunta di `videoUrl` reali (resta `null` come oggi —
  scope di TODO [18] separato).
- ❌ Modifiche a UI / filtri / SectionList / database layer /
  schema / migration / componenti.
- ❌ Nuove dipendenze (tutto è scrittura testuale).
- ❌ Aggiunta di esercizi diversi da quelli prescritti
  (l'orchestratore ha già curato la lista — la worker scrive
  solo description + guideSteps).
- ❌ Cambio di `ExerciseLevel` o introduzione di un nuovo enum
  (resta `principiante` / `intermedio` / `avanzato` come oggi).

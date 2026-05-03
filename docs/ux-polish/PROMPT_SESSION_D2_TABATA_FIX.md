# UX Polish — Sessione D2 (Fix Tabata: auto-advance + suoni)

## Pre-requisiti (verifica prima di lanciare)

- `main` aggiornato post-merge sessione D (PR #67) e cleanup orchestratore (commit `72a49db`).
- File audio già presenti su main in `assets/sounds/`:
  `8bit.wav`, `cool.wav`, `countdown-tick.wav`, `gogogo.wav`.
- `npm ci` + `npm run typecheck` puliti.

## Branch da creare

`claude/ux-polish-tabata-sounds-<rand>` (suffisso random 5 char).

## Scope

Sessione piccola di fix + integrazione audio sul Tabata. Tre interventi:

1. **Fix bug auto-advance work↔rest**: a fine fase, il Tabata non
   passa automaticamente alla fase successiva. Bisogna premere
   Pausa/Riprendi per sbloccarlo. Diagnosi: `TabataScreen.tsx:72-78`
   ha `useEffect` con dep `[intervalState?.endsAt, running, paused]`.
   `endsAt` cambia solo all'avvio di una nuova fase, mai durante.
   Quindi `Date.now() < endsAt` viene controllato una volta sola e
   mai più. Il `setInterval` di tick a riga 61 incrementa `tick`
   ogni 200ms ma non re-triggera l'effect.
2. **Refactor `countdownSound.ts` → `sportSounds.ts`**: il modulo
   attuale carica hardcoded `countdown-tick.wav` ed espone solo
   `playCountdownTick()`. Va generalizzato a una factory che
   cachi più sound per file e a esporre 3 funzioni dedicate:
   `playTick()` (8bit), `playWorkStart()` (gogogo), `playRestStart()` (cool).
3. **Integrazione audio in `TabataScreen.tsx`**:
   - Countdown 5→1 di start (post Hold) → `playTick()` (8bit)
   - Inizio ogni fase Lavoro → `playWorkStart()` (gogogo)
   - Inizio ogni fase Recupero → `playRestStart()` (cool)
   - Ultimi 5s di ogni fase (lavoro + recupero) → `playTick()` (8bit)

Effort stimato: S (~1-2h).

---

## Prompt da incollare

````
Sei in /home/user/FatTrack su branch main aggiornato.

Sessione operaia UX Polish D2: fix bug auto-advance Tabata
(work↔rest non passa in automatico) + integrazione 3 nuovi suoni
sul Tabata (gogogo a inizio lavoro, cool a inizio recupero, 8bit
sui tick countdown). File audio già committati in
`assets/sounds/`. Sessione piccola, ~1-2h.

PRIMA DI INIZIARE leggi nell'ordine:
1. CLAUDE.md (vincoli stilistici, no nuove librerie, italiano UI).
2. `src/screens/sport/TabataScreen.tsx` (per capire flow tick,
   `advanceInterval`, `handleCountdownComplete`, `handleTick`,
   `RunningView`).
3. `src/utils/countdownSound.ts` (modulo da rinominare/estendere
   in sportSounds.ts).
4. Verifica i 4 file in `assets/sounds/`: `8bit.wav`, `cool.wav`,
   `countdown-tick.wav`, `gogogo.wav`.

API e moduli disponibili (NON cambiare):
- `expo-av` Audio.Sound già in deps (caricato in C3.1).
- `lightHaptic()` da `@/utils/haptics` (rispetta flag
  `hapticEnabled`).
- `useAppTheme()` da `@/theme/ThemeContext`.

Crea il branch:
```
git checkout -b claude/ux-polish-tabata-sounds-<rand>
```

---

## Step D2.1 — Fix bug auto-advance work↔rest

File: `src/screens/sport/TabataScreen.tsx`

Diagnosi (rileggi se ti aiuta):
- Riga 59-63: `setInterval(() => setTick(t => t + 1), 200)` ogni
  200ms incrementa `tick` ma il valore non è dep di nessun
  effect.
- Riga 72-78: `useEffect` controlla `Date.now() < intervalState.endsAt`
  e chiama `advanceInterval()`. Dep:
  `[intervalState?.endsAt, running, paused]`.
- `endsAt` cambia solo all'inizio di una nuova fase (riga 86,
  103, 119). Quindi durante una fase, `endsAt` resta costante
  → effect non rieseguito → check mai ripetuto.
- Sintomo: a fine fase, l'utente deve premere Pausa/Riprendi
  per cambiare `paused` e ritriggerare l'effect, che a quel
  punto trova `Date.now() > endsAt` e chiama `advanceInterval`.

Fix (preferito): unifica tick + check dentro lo stesso
`setInterval`. Sposta il check `Date.now() >= endsAt` dentro il
callback del setInterval, e rimuovi l'`useEffect` separato di
controllo. Pattern:

```ts
useEffect(() => {
  if (!running || paused) return;
  const id = setInterval(() => {
    setTick(t => t + 1);
    const current = intervalStateRef.current;
    if (current && Date.now() >= current.endsAt) {
      advanceInterval();
    }
  }, 200);
  return () => clearInterval(id);
}, [running, paused]);
```

Verifica:
- `intervalStateRef` già esiste (riga 68-71), continua a essere
  aggiornato dall'effect a riga 69-71 — lascialo.
- Rimuovi del tutto l'`useEffect` di riga 72-78 (la logica è ora
  dentro il setInterval).
- `RunningView` riceve `intervalState` come prop e mostra il
  countdown — il re-render a ogni tick continua a funzionare
  (setTick triggera re-render, RunningView legge `Date.now()`).

Smoke test (manuale, dopo): avvia Tabata → countdown 5→1 →
Round 1 Lavoro: aspetta che il timer arrivi a 0 → deve passare
in automatico a Round 1 Recupero senza dover toccare nulla. Idem
da rest a work (Round 2 Lavoro). Ripeti per 2-3 transizioni.

Commit suggerito:
`fix(sport): Tabata avanza fase in automatico (check dentro setInterval tick)`

---

## Step D2.2 — Refactor `countdownSound.ts` → `sportSounds.ts`

File da rinominare: `src/utils/countdownSound.ts` → `src/utils/sportSounds.ts`

Motivazione: il modulo attuale è single-file hardcoded. Va
generalizzato per gestire 3 suoni distinti con la stessa cache
pattern (Audio.Sound creato lazy una volta, replayAsync su tick
successivi).

Implementazione:

```ts
import { Audio } from 'expo-av';

// Cache per file: ogni Sound viene creato una sola volta per
// la durata dell'app e riprodotto via replayAsync. Pattern già
// rodato per countdown-tick in C3.1.

type SoundKey = 'tick' | 'workStart' | 'restStart';

const SOUND_FILES: Record<SoundKey, number> = {
  tick: require('../../assets/sounds/8bit.wav'),
  workStart: require('../../assets/sounds/gogogo.wav'),
  restStart: require('../../assets/sounds/cool.wav'),
};

const cache: Partial<Record<SoundKey, Audio.Sound>> = {};
const loading: Partial<Record<SoundKey, Promise<Audio.Sound | null>>> = {};

async function getSound(key: SoundKey): Promise<Audio.Sound | null> {
  if (cache[key]) return cache[key]!;
  if (loading[key]) return loading[key]!;
  loading[key] = (async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(SOUND_FILES[key]);
      cache[key] = sound;
      return sound;
    } catch (err) {
      console.warn(`sound ${key} not loadable`, err);
      return null;
    } finally {
      delete loading[key];
    }
  })();
  return loading[key]!;
}

async function play(key: SoundKey): Promise<void> {
  const s = await getSound(key);
  if (!s) return;
  try {
    await s.replayAsync();
  } catch {
    // Riproduzione fallita (interruzione audio): degrado silenzioso.
  }
}

export const playTick = () => play('tick');
export const playWorkStart = () => play('workStart');
export const playRestStart = () => play('restStart');

export async function unloadAllSounds(): Promise<void> {
  for (const key of Object.keys(cache) as SoundKey[]) {
    await cache[key]?.unloadAsync().catch(() => {});
    delete cache[key];
  }
}
```

Verifica:
- Cancella `src/utils/countdownSound.ts` (file vecchio).
- Aggiorna l'import in `TabataScreen.tsx` (`playCountdownTick`
  → `playTick` e `playWorkStart` / `playRestStart` come nuovi).
- `countdown-tick.wav` resta in `assets/sounds/` (non usato per
  ora dal Tabata, riservato per usi futuri — non cancellarlo).
- Verifica con `grep -rn "countdownSound\|playCountdownTick" src/`
  che non rimangano referenze al vecchio modulo.

Commit suggerito:
`refactor(sport): countdownSound → sportSounds con 3 loader (tick/work/rest)`

---

## Step D2.3 — Integrazione audio in TabataScreen

File: `src/screens/sport/TabataScreen.tsx`

A — countdown 5→1 di start: già esistente in `handleTick`
(riga 127-130). Sostituisci `playCountdownTick()` con `playTick()`
(import nuovo). Resto invariato.

B — inizio fase Lavoro (gogogo): in `handleCountdownComplete`
(riga 114-125, l'avvio del primo Round Lavoro post countdown 5→1)
e in `advanceInterval` quando entra in `phase: 'work'` (riga
103-107, ogni Round successivo). Chiama `playWorkStart()` in
entrambi i punti.

C — inizio fase Recupero (cool): in `advanceInterval` quando
entra in `phase: 'rest'` (riga 86-91). Chiama `playRestStart()`.

D — ultimi 5s di ogni fase (lavoro + recupero): nuovo. Dentro
il setInterval di tick (vedi D2.1), dopo aver incrementato il
tick e prima del check di avanzamento, calcola il secondo
rimanente e triggera `playTick()` quando entra negli ultimi 5
secondi. Pattern dedup (Set di "secondi già emessi" per la fase
corrente) per evitare doppi haptic/audio ai bordi del tick
200ms — stesso approccio di `RestTimer.tsx` (vedilo come
reference, sessione C2 commit `41e3662`).

Esempio:

```ts
// Ref per dedup tick negli ultimi 5s, resettato a ogni nuova fase
const tickedSecondsRef = useRef<Set<number>>(new Set());

// Nel useEffect del setInterval:
useEffect(() => {
  if (!running || paused) return;
  const id = setInterval(() => {
    setTick(t => t + 1);
    const current = intervalStateRef.current;
    if (!current || current.phase === 'done') return;
    const remainingMs = current.endsAt - Date.now();
    if (remainingMs <= 0) {
      tickedSecondsRef.current.clear();
      advanceInterval();
      return;
    }
    const remainingSec = Math.ceil(remainingMs / 1000);
    if (remainingSec <= 5 && remainingSec >= 1) {
      if (!tickedSecondsRef.current.has(remainingSec)) {
        tickedSecondsRef.current.add(remainingSec);
        void playTick();
        void lightHaptic();
      }
    }
  }, 200);
  return () => clearInterval(id);
}, [running, paused]);

// Reset del Set anche su cambio fase (in advanceInterval):
function advanceInterval() {
  tickedSecondsRef.current.clear();
  // ... resto invariato
}
```

NOTA: anche `handleCountdownComplete` (start primo round) deve
fare clear del Set per evitare che 5,4,3,2,1 della Hold-to-start
siano "già emessi" nel Set quando inizia Round 1 Lavoro.

Verifica:
- `intervalStateRef` (riga 68-71) continua a essere aggiornato
  dall'effect esistente.
- `lightHaptic()` accompagna ogni tick come oggi.
- Resta invariato il flow visivo (RunningView, pie chart, label).

Commit suggerito:
`feat(sport): integra suoni Tabata (gogogo work, cool rest, 8bit tick)`

---

## Vincoli operativi

- **Italiano** in tutti i testi UI nuovi (nessuno previsto qui,
  tutto è audio).
- **No nuove librerie**. Usa solo `expo-av` già in deps.
- **No PR**. Push del branch + stop.
- **No git push --force**, no hook-skip.
- **No touch a `countdown-tick.wav`**: resta in repo, non più usato
  dal Tabata ma preservato per usi futuri (es. RestTimer della
  sessione live).
- **No touch ad altri timer / RestTimer / RestTimerStandaloneModal**:
  scope solo Tabata. Gli haptic-only del RestTimer sessione live
  restano invariati (vedi C2).

## Smoke test (verifica manuale dopo l'implementazione)

1. **Typecheck pulito**: `npm run typecheck`.
2. **Bug auto-advance fixed**: tab Tabata → Hold to start →
   countdown 5→1 → Round 1 Lavoro: aspetta i 20s, deve passare
   automaticamente a Round 1 Recupero. Aspetta 10s, deve passare
   automaticamente a Round 2 Lavoro. Ripeti per 2-3 transizioni.
   Niente più necessità di premere Pausa/Riprendi.
3. **Audio start countdown 5→1**: durante il countdown post-Hold,
   ogni tick suona `8bit.wav` (verifica audio è quello nuovo, non
   il vecchio `countdown-tick.wav`).
4. **Audio inizio Lavoro**: quando il countdown 5→1 finisce e
   parte Round 1 Lavoro → suona `gogogo.wav`. Idem ogni Round
   successivo (Round 2 Lavoro, Round 3 Lavoro, ...).
5. **Audio inizio Recupero**: quando finisce Round 1 Lavoro e
   inizia Round 1 Recupero → suona `cool.wav`. Idem ogni
   recupero successivo.
6. **Audio tick ultimi 5s**: durante una fase Lavoro (es. workSec
   = 20), negli ultimi 5 secondi (countdown 5,4,3,2,1) suona
   `8bit.wav` con haptic ad ogni secondo. Stesso comportamento
   nei 5 secondi finali della fase Recupero.
7. **No doppi tick**: i 5 tick devono essere distinti, non
   raddoppiati ai bordi del polling 200ms.
8. **Pausa/Riprendi**: durante una fase, premi Pausa: il timer si
   ferma, niente audio. Riprendi: il timer continua, e se sei
   negli ultimi 5s i tick rimasti suonano (al massimo i secondi
   non già emessi).
9. **Termina + restart**: termina l'allenamento (reset), riavvia:
   tutti i suoni ripartono correttamente (cache audio
   funzionante, niente errori in console).

## Note finali per la sessione operaia

- Effort stimato: ~1-2h. Fix puntuale, no architettura.
- Commit incrementali (D2.1 → D2.3).
- Push del branch con `git push -u origin <branch>` (retry su
  errori network, max 4 tentativi con backoff esponenziale).
- Niente PR (l'utente la crea da sé).
- Trailer commit standard: `https://claude.ai/code/session_<id>`.

Procedi.
````

---

## Note operative per chi avvia la sessione

- Tempo atteso: ~1-2h.
- Branch dedicato: `claude/ux-polish-tabata-sounds-<rand>`.
- A merge avvenuto, l'orchestratore:
  - aggiorna `docs/ORCHESTRATOR_HANDOFF.md` §6.2 con la riga D2.
  - cancella questo file `PROMPT_SESSION_D2_TABATA_FIX.md` nello stesso commit.
  - aggiorna §9 (D2 ✅, prossima E).
  - parte con sessione E ([14] backup tabelle sport).

## Cosa NON includere (scope creep prevention)

- ❌ Touch a `countdown-tick.wav` (resta in repo).
- ❌ Touch a `RestTimer` o `RestTimerStandaloneModal` o
  `ActiveSessionContext` (gli audio haptic-only di quei moduli
  restano invariati).
- ❌ Aggiungere altri suoni o personalizzazione (volume, mute,
  ecc.). Il toggle `hapticEnabled` esistente disabilita SOLO
  l'haptic, non l'audio — voluto, l'audio è essenziale per il
  Tabata "circuito a occhi chiusi".
- ❌ Estensione del refactor sportSounds.ts ad altri domini
  (RestTimer della sessione live, ecc.) — scope futuro.
- ❌ Aggiungere voci TODO nuove (questa sessione non chiude voci
  formali, è un fix + feature minore — riferimento nei commit
  message basta).

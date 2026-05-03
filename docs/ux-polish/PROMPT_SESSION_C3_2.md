# Prompt sessione operaia — UX Polish C3.2 (timer pausa standalone in SportHome)

> **Pre-requisiti**: branch `main` aggiornato (HEAD `2389151` o successivo).
> Branch atteso per questa sessione: `claude/ux-polish-rest-timer-standalone`.
> Voci TODO chiuse al merge: [36].
> Effort stimato: ~2-3h.
> Indipendente da C3.1: si può lanciare prima, dopo o in parallelo.
> Niente conflitti di file attesi (C3.1 tocca TimerScreen / DB /
> primitives sport; C3.2 tocca SportHomeScreen e crea un nuovo
> modal pausa).

Spin-off della modalità "Libero" che esce dal tab Tabata (vedi
[35]/C3.1). Pulsante dedicato in SportHome accanto a Spotify, su
una sola riga 50/50. Use case del proprietario: timer di riposo
configurabile al volo per allenamenti non guidati.

---

## Prompt da incollare

```
Sei in /home/user/FatTrack su branch main aggiornato.

Implementa la SESSIONE C3.2 di "UX Polish": timer pausa
standalone in SportHomeScreen + ridisegno riga Spotify.
Tre commit, in ordine.

PRIMA DI INIZIARE leggi nell'ordine:
1. CLAUDE.md — vincoli stilistici (design system, no nuove
   lib, StyleSheet + tokens, italiano nei testi).
2. docs/TODO.md voce [36] per il contesto utente.
3. docs/ux-polish/BRAINSTORM_C3_TABATA.md sezione 3.2 — la
   decisione di prodotto.
4. src/screens/sport/SportHomeScreen.tsx — qui vivono il
   `<SpotifyCard>` (linea ~236) e il componente
   `function SpotifyCard` (linea ~440). Sono il punto da
   ridisegnare: oggi card a riga intera, vanno entrambe (la
   nuova "Timer pausa" + Spotify) ridotte a metà larghezza
   affiancate.
5. src/components/sport/RestTimer.tsx — pattern di pie chart
   SVG (helper `describeArc`) per il countdown. Riusabile.
6. src/utils/haptics.ts — successHaptic / lightHaptic per il
   completamento.

API e file disponibili (riusa, NON ricreare):

- @/utils/haptics: lightHaptic / successHaptic.
- @/components/Icon: ha già `'timer'`, `'play'`, `'pause'`,
  `'close'`. Niente icone nuove necessarie.
- @/theme: colors, spacing, radii, typography.
- useAppTheme(): per `accent`.
- react-native-svg per il pie chart.

Crea il branch:

  git checkout main
  git pull --ff-only origin main
  git checkout -b claude/ux-polish-rest-timer-standalone

I 3 step sotto, una alla volta, con commit separato per
ognuno. Dopo ogni commit: `npm run typecheck` deve passare.
Se la prima volta `node_modules` manca, fai `npm ci`.

Niente dipendenze nuove. Niente PR: alla fine fai solo
`git push -u origin claude/ux-polish-rest-timer-standalone`.
Sarò io a decidere il merge.

────────────────────────────────────────────────────────────────
STEP C3.2.1 — Modal "Timer pausa" standalone
────────────────────────────────────────────────────────────────

Crea **src/components/sport/RestTimerStandaloneModal.tsx**:

Modal fullscreen-ish (90% altezza) che ospita due fasi:

a) **Fase config** (quando il timer è fermo):
   - Header: titolo "Timer di pausa" + icona X in alto a sx.
   - 4 chip preset orizzontali: 30s · 60s · 90s · 120s. Tap
     imposta `selectedSec` e parte il timer.
   - In alternativa: stepper +/- per durata custom (range
     5-600 secondi step 5). Default 60s.
   - Sotto: bottone "Avvia" che fa partire il countdown.

b) **Fase countdown** (quando il timer è attivo):
   - Pie chart SVG centrale (riusa pattern di RestTimer.tsx —
     copia la funzione `describeArc` o estraine un helper
     `src/utils/svgArc.ts` se non l'hai già fatto in C3.1).
   - Numero countdown grosso al centro, color `accent`.
   - Sotto il pie chart: pulsanti riga: "+30s" (sx, riusa
     pattern di RestTimer), "Termina" (dx, chiude e torna a
     fase config) o "Pausa" (centro).
   - Logica:
     - Tick ogni 200ms come RestTimer.
     - A 0 → `successHaptic()` + chip-cards di feedback
       "Pausa terminata!" + reset a fase config (o auto-close
       dopo 2s, decidi il pattern più gradevole).
     - Pause: ferma il countdown (memorizza remainingMs) →
       Resume riparte da remainingMs.
     - +30s: bumpa endsAt + durationSec di 30s.
     - Termina: chiude il modal.

Stato interno del modal:
```ts
const [phase, setPhase] = useState<'config' | 'running' | 'paused'>('config');
const [durationSec, setDurationSec] = useState(60);
const [endsAt, setEndsAt] = useState<number | null>(null);
const [remainingMs, setRemainingMs] = useState(0); // per pausa
```

Niente persistenza DB (è "al volo", scope deciso del
proprietario).

Niente notifica push (è "al volo", il proprietario è in app
mentre lo usa — diverso da [16]/RestTimer che notifica perché
parte automaticamente in sessione live).

Smoke test mentale:
- Apri modal → vedo 4 chip preset (30/60/90/120s) + stepper
  custom.
- Tap "60s" → parte countdown da 60s con pie chart.
- A metà: tap "+30s" → countdown salta a ~75s rimanenti.
- Pausa → numero freezato → Resume → riprende da dove era.
- A 0 → success haptic + reset a fase config.
- Tap X → chiude modal, eventuale countdown attivo cancellato.

Commit:

  feat(sport): nuovo RestTimerStandaloneModal (timer pausa al volo)

  Modal "Timer di pausa" con due fasi (config + countdown).
  Fase config: 4 chip preset (30/60/90/120s) + stepper
  custom. Fase countdown: pie chart SVG (riuso pattern da
  RestTimer), numero centrale, pulsanti +30s / pausa / termina.
  Niente persistenza DB (al volo per design). Niente
  notifica push (uso in foreground per design).

  Parte di TODO [36].

────────────────────────────────────────────────────────────────
STEP C3.2.2 — Pulsante "Timer pausa" in SportHomeScreen
────────────────────────────────────────────────────────────────

Modifica **src/screens/sport/SportHomeScreen.tsx**:

a) Aggiungi stato per il modal:
```ts
const [restTimerModalOpen, setRestTimerModalOpen] = useState(false);
```

b) Sostituisci la riga 236 (`<SpotifyCard ...>`) con una nuova
   composizione **a due card affiancate 50/50**:

   ```tsx
   <View style={styles.quickActionsRow}>
     <View style={styles.quickActionHalf}>
       <SpotifyCard
         accent={theme.accent}
         onPress={handleOpenSpotify}
       />
     </View>
     <View style={styles.quickActionHalf}>
       <RestTimerCard
         accent={theme.accent}
         onPress={() => setRestTimerModalOpen(true)}
       />
     </View>
   </View>
   ```

c) Aggiorna il **componente `SpotifyCard`** (linea ~440):
   - Ridurre il contenuto interno per stare in metà larghezza.
   - Layout suggerito: icona `music` in alto + label "Spotify"
     sotto (column invece di row). Niente sottotesto
     descrittivo "Avvia la musica per il tuo allenamento."
     (troppo lungo per metà colonna).
   - Niente chevron.
   - Padding: spacing.md, radii.lg, sfondo bianco
     (`colors.card`), borderColor `colors.border` o accent
     leggero.

d) Crea **`RestTimerCard`** sotto a SpotifyCard (stesso file)
   con stesso pattern visivo:
   ```tsx
   function RestTimerCard({ accent, onPress }: Props) {
     return (
       <Pressable onPress={onPress} accessibilityRole="button"
         accessibilityLabel="Apri timer pausa">
         <Card style={styles.quickActionCard}>
           <Icon name="timer" size={22} color={accent} />
           <Text style={typography.bodyBold}>Timer pausa</Text>
         </Card>
       </Pressable>
     );
   }
   ```

e) Aggiungi gli stili:
   ```ts
   quickActionsRow: {
     flexDirection: 'row',
     gap: spacing.sm,
   },
   quickActionHalf: {
     flex: 1,
   },
   quickActionCard: {
     padding: spacing.md,
     alignItems: 'center',
     gap: spacing.xs,
   },
   ```

f) Nel return di SportHomeScreen, dopo la `<ScrollView>` o
   come ultimo figlio prima della chiusura, monta il modal
   condizionalmente:
   ```tsx
   <RestTimerStandaloneModal
     visible={restTimerModalOpen}
     onClose={() => setRestTimerModalOpen(false)}
   />
   ```

Smoke test mentale:
- Apri SportHome → vedi due card metà larghezza affiancate:
  Spotify (icona music + label) e Timer pausa (icona timer +
  label).
- Tap Spotify → apre Spotify come prima.
- Tap Timer pausa → apre RestTimerStandaloneModal.

Commit:

  feat(sport): pulsante "Timer pausa" in SportHomeScreen, riga 50/50 con Spotify

  Sostituisce la card a riga intera Spotify con una riga a due
  card affiancate (50/50): SpotifyCard ridisegnata per metà
  larghezza (icona music + label, niente sottotesto/chevron) +
  nuova RestTimerCard che apre RestTimerStandaloneModal.
  Stili `quickActionsRow` / `quickActionHalf` /
  `quickActionCard` riusabili se in futuro arriveranno altre
  quick action.

  Parte di TODO [36].

────────────────────────────────────────────────────────────────
STEP C3.2.3 — Helper SVG arc condiviso (cleanup opzionale)
────────────────────────────────────────────────────────────────

Se hai duplicato la funzione `describeArc` tra `RestTimer.tsx`
e `RestTimerStandaloneModal.tsx`, estraila ora in un helper
condiviso:

Crea **src/utils/svgArc.ts**:
```ts
export function polarToCartesian(
  cx: number, cy: number, r: number, angleDeg: number,
): { x: number; y: number } {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

export function describeArc(
  cx: number, cy: number, r: number,
  startAngle: number, endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}
```

Aggiorna `RestTimer.tsx` e `RestTimerStandaloneModal.tsx` per
importare da `@/utils/svgArc`. Cancella le definizioni inline
duplicate.

Se invece la funzione era già stata estratta in C3.1 (caso in
cui C3.1 è stata mergeata prima di questa sessione), questo
step si riduce a un import-only refactor: salta la creazione
e usa l'helper esistente.

Commit (solo se hai effettivamente estratto):

  refactor(sport): estrai describeArc/polarToCartesian in src/utils/svgArc.ts

  Helper SVG riusabile da RestTimer (sessione C2),
  RestTimerStandaloneModal (questa sessione) e potenzialmente
  HoldToStartButton/CountdownOverlay (sessione C3.1, se
  mergeata in modo indipendente). Pattern già usato da
  CalorieRing — questo lo rende davvero condiviso.

Se invece era già condiviso o hai preferito tenere inline:
salta questo step e fai solo i 2 commit precedenti.

────────────────────────────────────────────────────────────────
PUSH FINALE
────────────────────────────────────────────────────────────────

  npm run typecheck     # ultima verifica
  git push -u origin claude/ux-polish-rest-timer-standalone

Riepiloga in chat:
- 2 o 3 commit sul branch (a seconda dello step 3).
- 1 voce TODO da chiudere al merge: [36].
- Cosa ha senso QA-are manualmente sul device dopo il merge:
  - apri SportHome → due card metà larghezza visibili sotto
    "Allenamento di oggi";
  - tap Timer pausa → modal config (4 preset + stepper);
  - tap "60s" → countdown parte;
  - tap "+30s" durante countdown → bumpa correttamente;
  - pausa/resume → comportamento corretto;
  - a 0 → haptic success + ritorno a fase config;
  - chiusura → eventuale countdown cancellato pulito.

Procedi.
```

---

## Note operative per chi avvia la sessione

- Tempo atteso: ~2-3h.
- Dipendenze nuove introdotte: NESSUNA.
- Modifiche allo schema DB: NESSUNA.
- Niente provider nuovi.
- Indipendente da C3.1: può girare in parallelo o prima/dopo.

## Cosa NON includere in questa sessione (scope creep prevention)

- Niente persistenza DB del timer pausa standalone (è "al volo"
  per design).
- Niente notifiche push da expo-notifications per il
  completamento del timer pausa (l'utente è in foreground per
  design — diverso dal RestTimer di sessione live coperto da
  [16]).
- Niente integrazione con `ActiveSessionContext` (è uno spin-off
  totalmente standalone, non vuole sapere se c'è una sessione
  in corso).
- Niente edit a CLAUDE.md / ORCHESTRATOR_HANDOFF.md / TODO.md.
- Niente refactor di altre quick action in SportHome
  (`TodayCard`, `WeekCard`, ecc.).

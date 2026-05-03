# Prompt sessione operaia — UX Polish C2 (Polish RestTimer + notifiche fine recupero)

> **Pre-requisiti**: branch `main` aggiornato (HEAD `fb23231` o successivo,
> dopo merge UX Polish A+B). Indipendente da C1: si può lanciare prima,
> dopo o in parallelo. Nessun conflitto di file atteso (C1 tocca
> WheelPicker / TimerScreen / ActiveSessionScreen, C2 tocca RestTimer /
> ActiveSessionContext / app.json).
> Branch atteso per questa sessione: `claude/ux-polish-resttimer-notifications`.
> Voci TODO chiuse al merge: [25], [16].
> Effort stimato: ~4h.

Sessione di polish UX raggruppata sul tema "feedback fine recupero".
Due interventi: ridisegno del RestTimer (pie chart + pulsante +30s + bip
negli ultimi 5 secondi) e notifica locale Android per quando l'app è in
background. Due commit, uno per voce.

---

## Prompt da incollare

```
Sei in /home/user/FatTrack su branch main aggiornato.

Implementa la SESSIONE C2 di "UX Polish": polish del RestTimer +
notifiche locali fine recupero. Due commit, uno per intervento.

1. [25] RestTimer — sostituisci la barra lineare con un pie
   chart (arco SVG) di progresso, aggiungi pulsante "+30s" che
   estende il countdown, e bip negli ultimi 5 secondi (haptic
   ripetuto, niente expo-av).
2. [16] Notifiche locali — quando parte un recupero, schedula
   una notifica Android che scatta al termine. Cancellata se
   l'utente salta/pausa/termina la sessione prima.

PRIMA DI INIZIARE leggi nell'ordine:
1. CLAUDE.md — vincoli stilistici (design system, no nuove lib UI,
   StyleSheet + tokens, italiano nei testi).
2. docs/TODO.md voci [25] e [16] per il contesto utente.
3. src/components/sport/RestTimer.tsx — il componente da
   ridisegnare. Già 90 righe, struttura semplice: numero
   centrale + barra lineare. Già chiama `successHaptic()` a fine
   countdown (linea ~46, dalla Sessione A).
4. src/contexts/ActiveSessionContext.tsx — qui il provider gestisce
   `endsAt` del recupero, AppState handlers, schedule/cancel di
   logica live. Qui agganci la schedulazione/cancellazione delle
   notifiche per [16].
5. src/components/CalorieRing.tsx — pattern di SVG arc da imitare
   per il pie chart progresso del RestTimer (Path con d-attr
   calcolato dal progress 0-1).
6. src/utils/haptics.ts — già espone `lightHaptic()` /
   `successHaptic()` (dalla Sessione A). Usa `lightHaptic()` per
   i bip degli ultimi 5 secondi.
7. app.json — qui aggiungi il plugin `expo-notifications` con
   permessi notification.

API e file disponibili (riusa, NON ricreare):

- @/utils/haptics: lightHaptic(), successHaptic(),
  refreshHapticPreference(). Già rispetta il flag hapticEnabled.
- @/theme: colors, spacing, radii, typography.
- useAppTheme() per `accent`.
- react-native-svg: GIÀ presente in package.json (usato da
  CalorieRing). Riusa Svg / Path / Circle.
- ActiveSessionContext: già espone `state` (con `endsAt`,
  `restDurationSec`, `phase`, ecc.), `skipRest`, `endSession`,
  `pauseSession`, `resumeSession`. Aggiungerai un'azione
  `extendRest(seconds: number)` per il +30s.

Crea il branch:

  git checkout main
  git pull --ff-only origin main
  git checkout -b claude/ux-polish-resttimer-notifications

I 2 step sotto, una alla volta, con commit separato per ognuno.
Dopo ogni commit: `npm run typecheck` deve passare. Se la prima
volta `node_modules` manca, fai `npm ci`.

Dipendenza nuova autorizzata: `expo-notifications` (solo per
step C2.2). Niente altre lib.

Niente PR: alla fine fai solo `git push -u origin
claude/ux-polish-resttimer-notifications`. Sarò io a decidere il
merge.

────────────────────────────────────────────────────────────────
STEP C2.1 — [25] RestTimer polish (pie chart + +30s + bip 5s)
────────────────────────────────────────────────────────────────

Modifica **src/components/sport/RestTimer.tsx**:

a) Pie chart (arco SVG) al posto della barra lineare:
- Layout: container quadrato (es. 200x200) con il pie chart
  centrale e dentro il numero del countdown.
- Sostituisci `styles.track` + `styles.bar` (linee ~60-65) con
  un `<Svg width={size} height={size}>` contenente:
  - un cerchio di sfondo (colore `colors.border` o
    `theme.bgTint`, opacity 0.3) per indicare il pieno;
  - un Path arc che parte da angolo -90° (top) e si estende per
    `progress * 360°` in senso orario, color `theme.accent`,
    `strokeWidth ~12`, `strokeLinecap="round"`, `fill="none"`.
- Calcolo del Path arc: vedi pattern di CalorieRing
  (è il riferimento canonico nel progetto). Funzione helper
  tipo:
  ```ts
  function describeArc(cx, cy, r, startAngle, endAngle): string {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  }
  ```
- Numero countdown: `<Text>` posizionato in absolute al centro
  (style `position: 'absolute', top: 0, left: 0, right: 0,
  bottom: 0, justifyContent: 'center', alignItems: 'center'`).
  Riusa `styles.countdown` esistente (font grande, colore
  accent).
- Etichetta "Recupero" sopra il pie chart in `typography.label`
  come oggi.

b) Pulsante "+30s":
- Sotto il pie chart, una `<Pressable>` stretta (chip-style):
  testo "+30s", padding `spacing.sm horizontal × spacing.xs vertical`,
  borderRadius `radii.full`, background `theme.bgTint` o
  `colors.bg2` (se esiste, sennò colors.card con bordo), color
  `theme.accent`.
- onPress chiama una nuova funzione passata via prop:
  `onExtend(seconds: number)`. Il consumer (ActiveSessionScreen
  via ActiveSessionContext) gestisce l'estensione vera del
  countdown (vedi sotto).
- Il pulsante è disabilitato (`opacity 0.5`, no haptic) quando
  `paused === true`.

c) Bip negli ultimi 5 secondi:
- Dentro l'effect del countdown, aggiungi un secondo useEffect
  che fa scattare `lightHaptic()` ogni volta che `remainingSec`
  attraversa i valori 5, 4, 3, 2, 1 (NON al raggiungimento di 0
  — quello fa già `successHaptic()` finale).
- Implementazione: usa un `useRef<Set<number>>` per tracciare
  quali secondi hai già "biparato" — evita doppi haptic se il
  re-render coincide con il bordo del secondo (i 200ms di TICK
  potrebbero generare 2 trigger sullo stesso bordo). Reset del
  Set quando `endsAt` cambia (= nuovo recupero parte).
- Skip se `paused === true` (così non bipa quando l'utente è in
  pausa).

d) Modifica firma RestTimer:

```ts
type Props = {
  endsAt: number;
  durationSec: number;
  paused?: boolean;
  onComplete?: () => void;
  onExtend?: (seconds: number) => void;  // NUOVO
};
```

Aggiungi ad **src/contexts/ActiveSessionContext.tsx** una nuova
azione `extendRest(seconds: number)`:
- Se la sessione non è in fase "rest", no-op.
- Aggiorna lo stato con `endsAt: state.endsAt + seconds * 1000` e
  `restDurationSec: state.restDurationSec + seconds` (così il
  pie chart progress resta coerente).
- Persiste su DB: `sessionsDB.updateActiveSession({ endsAt: ... })`
  o equivalente — usa lo stesso pattern delle altre mutazioni del
  contesto.
- Esponi nel value del Provider e nel hook `useActiveSession`.

In **src/screens/sport/ActiveSessionScreen.tsx**:
- Trova il punto dove monta `<RestTimer ... />` e aggiungi la
  prop `onExtend={(s) => extendRest(s)}` (o equivalente alla
  firma del context).

Smoke test mentale:
- Inizio sessione → completo set → parte recupero 60s → vedo
  pie chart che si svuota → tap "+30s" → countdown salta a 90s
  e il pie chart si riallinea proporzionalmente → ultimi 5s bip
  un secondo l'uno → 0 → haptic success → fine recupero.
- Pausa durante recupero → pulsante +30s disabilitato → riprendi
  → continua come prima.

Commit:

  feat(sport): polish RestTimer (pie chart + 30s + bip 5s finali)

  Sostituita la barra di progresso lineare con un pie chart SVG
  (arco -90° → -90° + progress*360°) per visualizzazione più
  immediata del tempo che scorre. Aggiunto pulsante "+30s" che
  estende il recupero (nuova action extendRest in
  ActiveSessionContext, persistente su DB). Bip con
  lightHaptic() negli ultimi 5 secondi del countdown (deduplicato
  via Set di secondi già emessi). RestTimer accetta nuova prop
  onExtend opzionale.

  Chiude TODO [25]. Niente expo-av: i "bip" sono haptic
  (rispettano il flag hapticEnabled già esistente).

────────────────────────────────────────────────────────────────
STEP C2.2 — [16] Notifiche locali fine recupero (expo-notifications)
────────────────────────────────────────────────────────────────

Aggiungi expo-notifications:

  npm install expo-notifications

In **app.json**:
- Aggiungi al `plugins`:
  ```json
  [
    "expo-notifications",
    {
      "color": "#F97316"  // accent sport, verifica il valore
                          // esatto da @/theme/sportMode.ts
    }
  ]
  ```
- Niente permessi extra in `android.permissions`: expo-notifications
  gestisce `POST_NOTIFICATIONS` via plugin.

Crea **src/utils/restNotifications.ts**, helper centralizzato:

```ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let hasPermission: boolean | null = null;
let activeNotificationId: string | null = null;

export async function ensurePermission(): Promise<boolean> {
  if (hasPermission !== null) return hasPermission;
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') {
    hasPermission = true;
    return true;
  }
  if (status === 'undetermined') {
    const r = await Notifications.requestPermissionsAsync();
    hasPermission = r.status === 'granted';
    return hasPermission;
  }
  hasPermission = false;
  return false;
}

export async function scheduleRestEndNotification(seconds: number) {
  if (Platform.OS !== 'android') return; // MVP solo Android
  await cancelRestEndNotification();
  const ok = await ensurePermission();
  if (!ok) return;
  activeNotificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Recupero finito',
      body: 'Tocca per continuare l\'allenamento.',
      sound: 'default',
    },
    trigger: { seconds },
  });
}

export async function cancelRestEndNotification() {
  if (activeNotificationId) {
    await Notifications.cancelScheduledNotificationAsync(activeNotificationId).catch(() => {});
    activeNotificationId = null;
  }
}

export function invalidatePermissionCache() {
  hasPermission = null;
}
```

Configura il handler nelle prime righe di **App.tsx** (prima dei
provider):

```ts
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
```

Modifica **src/contexts/ActiveSessionContext.tsx**:
- Quando una transizione fa partire un recupero (cerca dove viene
  settato `phase = 'rest'` o equivalente): chiama
  `scheduleRestEndNotification(restSec)`.
- Quando il recupero termina, viene saltato, viene messo in pausa,
  viene esteso (+30s), o la sessione viene chiusa: chiama
  `cancelRestEndNotification()` (e nel caso di +30s rischedula
  con la nuova durata).
- Quando la sessione viene RIPRESA dalla pausa durante recupero:
  rischedula con i secondi rimanenti.
- AppState background/foreground: se l'utente torna in foreground
  e il recupero è ancora attivo, NON serve fare nulla (la
  notifica scatta da sola al termine; quando l'utente la apre
  arriva in app naturalmente).

Testing del flag haptic / suono:
- expo-notifications su Android suona di default — OK, è il
  comportamento atteso.
- L'haptic dei bip 5s di [25] continua a funzionare in
  background? NO, perché il JS è freezato. La notifica al
  termine compensa: l'utente non sente i bip ma riceve la
  notifica di fine recupero.

Smoke test (descrivi nel commit):
- Inizio sessione → completo set → recupero 60s parte → metto
  app in background → aspetto 60s → arriva notifica "Recupero
  finito" → tap → torno in app sulla schermata sessione attiva.
- Stesso scenario ma salto recupero a metà → niente notifica
  alla fine (cancellata).
- Stesso scenario ma metto in pausa → niente notifica alla fine.
- Stesso scenario ma estendo +30s → notifica scatta a 90s
  totali, non a 60.
- Permesso negato dall'utente → tutto il resto della sessione
  funziona, niente notifica (silently disabled).

Commit:

  feat(sport): notifiche locali Android al termine del recupero

  Aggiunta dipendenza expo-notifications + helper
  src/utils/restNotifications.ts. Quando un recupero parte,
  schedula una notifica con trigger a restSec; cancellata su
  skip/pausa/end/extend (rischedulata su extend con la nuova
  durata). Permessi richiesti la prima volta in modo lazy; se
  rifiutati, l'app continua a funzionare senza notifiche
  (silently disabled). MVP solo Android — iOS può seguire in
  iterazione futura.

  Chiude TODO [16].

────────────────────────────────────────────────────────────────
PUSH FINALE
────────────────────────────────────────────────────────────────

  npm run typecheck     # ultima verifica
  git push -u origin claude/ux-polish-resttimer-notifications

Riepiloga in chat:
- 2 commit sul branch.
- 2 voci TODO da chiudere al merge: [25], [16].
- Cosa ha senso QA-are manualmente sul device dopo il merge:
  - clean install APK, prima sessione → al primo recupero il
    permesso notifiche viene chiesto;
  - completi set → vedi pie chart che si svuota → tap "+30s" →
    countdown salta → ultimi 5s bip → app in background →
    notifica → tap → ritorno in sessione;
  - rifiuto permesso → tutto continua a funzionare senza
    notifiche.

Procedi.
```

---

## Note operative per chi avvia la sessione

- Tempo atteso: ~4h. Il pie chart è fattibile in <1h se l'agente ha
  CalorieRing come riferimento. Le notifiche richiedono cura nel
  cancellare/rischedulare in TUTTI i rami di transizione del
  contesto.
- Dipendenze nuove introdotte: `expo-notifications`. Niente lib UI.
- Modifiche allo schema DB: NESSUNA.
- Modifiche al manifest Android: il plugin expo-notifications
  inietta `POST_NOTIFICATIONS` al prebuild — verifica con grep
  dopo il merge.

## Cosa NON includere in questa sessione (scope creep prevention)

- Niente expo-av / suono custom: il TODO [25] dice "expo-haptics
  e/o expo-av per il suono" — partiamo da haptic (lib già
  presente). Audio file dedicato è iterazione futura.
- Niente notifiche iOS: MVP Android (l'utente è su S25 Ultra,
  iOS richiede config diversa con APNs / EAS push tokens).
- Niente refactor dell'AppState handler in ActiveSessionContext
  oltre alla rischedulazione necessaria.
- Niente edit a CLAUDE.md / ORCHESTRATOR_HANDOFF.md.
- Niente integrazione delle notifiche con [25] +30s in modo
  "intelligente" (es. notifica programmata per il NUOVO termine
  ma che arriva PRIMA per il vecchio termine). La logica è:
  cancel + reschedule, sempre.

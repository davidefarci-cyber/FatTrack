# Brainstorm — Redesign tab Tabata (post-C1/C2)

> **Tipo**: brainstorm di prodotto, NON piano operativo.
> **Stato**: discussione conclusa il 2026-05-03 con il proprietario.
> **Prossimo step**: orchestratrice valuta, aggiorna `docs/TODO.md`,
> prepara un prompt operativo (`PROMPT_SESSION_C3*.md` o nome
> appropriato) per una/più sessioni worker.
> **Vincolo**: questa sessione NON ha scritto codice. Tutte le
> decisioni di prodotto sono già prese (vedi sotto) e NON vanno
> rimesse in discussione: l'orchestratrice traduce in piano,
> l'operaia esegue.

---

## 1. Contesto

- **C1** (`PROMPT_SESSION_C1.md`, mergiata su main) ha introdotto il
  primitive `<WheelPicker>` (`src/components/WheelPicker.tsx`) e lo ha
  applicato a `TimerScreen` (workSec/restSec/rounds) e
  `ActiveSessionScreen` (reps fatte). Chiude TODO [31] e [24].
- **C2** (`PROMPT_SESSION_C2.md`, mergiata su main) ha lavorato sul
  polish del `RestTimer` e notifiche/haptic per fine recupero. Toccata
  TODO [16], [25] (e parte di [17] ulteriore).
- Durante l'uso reale post-C1 è emerso che il `TimerScreen` è poco
  comprensibile per chi non sa cos'è il Tabata: sembra un cronometro
  generico, mentre è un protocollo HIIT con valore proprio. Il
  proprietario vuole comunicare la natura specifica e "premium" di
  questo allenamento.

---

## 2. Vision

Trasformare il tab da utility generica a **esperienza dedicata al
protocollo Tabata**, con un trattamento da "lezione di palestra /
brochure" che valorizzi il workout. L'utente deve avere la sensazione
di entrare in un programma serio, non in un timer da cucina.

I "timer generici" (cronometro libero, intervalli liberi) escono da
questo tab perché diluiscono il messaggio.

---

## 3. Decisioni di design

### 3.1 Tab navigation

- **Renaming**: il tab `Timer` (oggi `TimerScreen`) si chiama **Tabata**.
- **Icona**: invariata (`timer`). L'associazione "icona timer →
  Tabata" è coerente perché Tabata È un protocollo a tempo.
- La modalità **Libero** ESCE dal tab (vedi 3.2).
- La modalità **Intervalli** non è più una voce di segmented control:
  diventa la **schermata di personalizzazione del Tabata** (config dei
  tempi e round) — vedi 3.4.
- **Conseguenza**: niente più `SegmentedControl` con 3 voci sulla home
  del tab. La home è una brochure mono-modalità.

### 3.2 Timer pausa standalone (ex modalità "Libero")

- Spostato fuori dal tab Tabata.
- Nuovo punto di accesso: **pulsante dedicato in `SportHomeScreen`**.
- **Layout**: il pulsante "Apri Spotify" oggi occupa una riga intera.
  Va ridotto a metà larghezza e affiancato dal nuovo pulsante "Timer
  pausa" (l'altra metà), su una sola riga.
- **Use case dichiarato dall'utente**: «una cosa fuori dall'allenamento
  guidato, da usare se voglio solo farmi seguire in una sessione mia
  non intensiva — un timer di riposo per non perdermi e rimanere fermo
  più del dovuto». Funzione semplice, niente protocollo.
- **Forma**: timer di riposo configurabile al volo (count-down).
  L'orchestratrice valuti se è preferibile un'unica schermata modale,
  un BottomSheet, o l'apertura diretta di un mini-timer inline. Il
  proprietario non ha vincolato la forma; vincola solo la funzione.

### 3.3 Home del tab Tabata (brochure)

Layout pensato come "presentazione di un corso di palestra":

- **Hero**: titolo accattivante (es. "Benvenuto nel circuito Tabata") +
  2-3 righe di copy divulgativa che spieghi a colpo d'occhio cosa è e
  perché vale la pena farlo. Tono "brochure", non manuale tecnico.
- **Stat-card / highlight numerici**: 2-3 micro-card che rendano
  tangibili i benefici (es. "4 minuti totali", "8 × 20s al massimo",
  "+28% capacità anaerobica" — riprendendo i numeri dello studio
  Tabata 1996). I numeri esatti li raffina l'orchestratrice; il
  proprietario non li ha vincolati.
- **Icona `info`** in alto a destra → apre un BottomSheet/modal con
  la **spiegazione scientifica completa** del Tabata: chi era il Dr.
  Izumi Tabata, lo studio originale, perché è efficace, distinzione
  Tabata "vero" vs interval training generico. Questo è il livello di
  approfondimento per chi vuole il "perché".
- **Icona `cog` (o testo "Personalizza")** in alto a sinistra (o
  accanto al titolo) → apre la schermata di config (vedi 3.4).
- **Pulsante hero "Avvia"**: tondo, grande, centrale, posizione
  dominante in basso. Hold-to-confirm ~2 secondi con effetto **glow**
  animato in `accent` (arancione sport). Rilascio prematuro →
  annullamento (nessun avvio).
- Niente picker visibili nella home.
- Niente segmented control nella home.

### 3.4 Schermata di personalizzazione (ex "Intervalli")

- Aperta dall'icona `cog` / pulsante "Personalizza" sulla home Tabata.
- Forma: schermata dedicata o BottomSheet. L'orchestratrice valuti
  in base a quale dà più peso "premium" e all'estetica del resto
  dell'app.
- **Campi**: 3 `<WheelPicker>` (work / rest / round) — coerenti con
  C1, default 20/10/8. Range: vedi C1 (work/rest 5-300 step 5,
  rounds 1-30 step 1).
- **Alternativa scartata**: stepper +/- con step 10s. Fattibile, ma
  sceglierei il WheelPicker per coerenza con l'introduzione recente
  e per evitare di forkare il design language.
- **Persistenza**: i valori personalizzati DEVONO sopravvivere alla
  riapertura. Motivazione del proprietario: «è il TUO Tabata, se mano
  a mano fai crescere la tua resistenza è giusto che alla volta dopo
  sia coerente con l'allenamento precedente».
- **Schema DB**: aggiungere ad `app_settings` 3 colonne
  (`tabata_work_sec`, `tabata_rest_sec`, `tabata_rounds`) con default
  20/10/8, idempotenti come gli altri campi `app_settings`. Esporre
  via `appSettingsDB` con getter/setter e cache come per
  `weekly_target_days`.

### 3.5 Flow di avvio

1. Utente preme e tiene il **pulsante hero "Avvia"** (~2s).
2. Glow cresce fino a saturazione → conferma visiva chiara che
   l'azione si sta confermando. Rilascio prima dei 2s → annulla.
3. A conferma: si apre un **overlay fullscreen** con countdown
   5 → 4 → 3 → 2 → 1.
4. **Animazione**: i numeri entrano "piccolo → grande con
   dissolvenza", uno alla volta, in stile videogame. Palette accent
   sport. Tipografia bold/extrabold dal theme.
5. **Audio + haptic per ogni tick**: REQUISITO esplicito del
   proprietario — «deve essere possibile sentire senza tenere il cell
   in mano e guardare lo schermo». Quindi audio (non solo haptic).
   Sinergia con l'infrastruttura introdotta in C2 — verificare se
   `expo-av` è già stato aggiunto o se va introdotto qui.
6. A "0" / fine countdown → si apre la pagina del **workout vero e
   proprio** (riusa l'attuale `RunningView` di `TimerScreen`, oppure
   sua evoluzione restyled). Il primo "Lavoro" parte automaticamente.
7. Da qui in poi il flow runtime resta come oggi: pause / resume /
   reset / termina.

---

## 4. Domande aperte (delegate all'orchestratrice o alla worker)

- **Copy esatta della brochure**: chi la scrive? Proposta:
  l'orchestratrice mette un draft nel prompt operativo, la worker lo
  inserisce, il proprietario raffina al merge.
- **Numeri delle stat-card**: confermare i valori dello studio Tabata
  1996 prima di metterli in app (evitare numeri inventati). Sources
  affidabili: paper originale Tabata et al. 1996 (Med Sci Sports
  Exerc), riassunti di rassegne più recenti.
- **Forma config (schermata vs BottomSheet)**: scelta estetica.
  Opinione: schermata dedicata dà più "peso premium"; BottomSheet è
  più rapido. L'orchestratrice decida.
- **Restyle di `RunningView` post-countdown**: il workout view attuale
  è generico ("Lavoro" / "Recupero" / "Round X"). Mantenerlo MVP o
  restyle subito per allinearlo al treatment premium? Suggerimento:
  MVP, restyle in iterazione futura (apri voce TODO).
- **Audio**: verificare stato `expo-av` post-merge C2. Se assente,
  aggiungerlo qui — niente alternative valide solo-haptic
  (requisito proprietario).
- **`Animated` vs `react-native-reanimated`**: il progetto oggi usa
  `Animated` built-in. Hold-to-start glow + countdown scale/fade sono
  fattibili nativamente. Niente nuove dipendenze.

---

## 5. Sinergie con backlog esistente

- **TODO [31]** "Migliorare UX TimerScreen (picker tipo orologio)" —
  parzialmente chiusa da C1 (WheelPicker per i campi). Va RIAPERTA o
  affiancata da una voce nuova dedicata a "Redesign tab Tabata"
  perché lo scope è cresciuto enormemente rispetto alla descrizione
  originale.
- **TODO [16]** "Notifiche locali fine recupero" e **[17]** "Haptic /
  suoni" — toccate da C2. La parte audio del countdown 5→1 può
  riusare la stessa infrastruttura introdotta lì.
- **TODO [25]** "Migliorare timer pausa tra serie" — già in scope C2,
  tematicamente vicino ma scope distinto. Il "timer pausa standalone"
  in SportHomeScreen (3.2) è una funzione diversa: non è il
  RestTimer di una sessione live, è un timer libero per allenamenti
  non guidati.
- Va aperta voce TODO **NUOVA** per il "Timer pausa standalone in
  SportHomeScreen" (sezione 3.2) — non è coperto da nessuna voce
  esistente.

---

## 6. Non in scope per la prossima sessione operaia

- Restyle radicale di `RunningView` post-countdown (iterazione futura,
  apri voce TODO se rilevante).
- Modifiche al flow `ActiveSessionScreen` (allenamenti guidati,
  ortogonale).
- Modifiche al `BarcodeScreen` o ad altre schermate diet.
- Generalizzazione del WheelPicker (già fatto in C1, niente da fare).
- Migrazione a `react-native-reanimated`.
- Restyle del segmented control / componente di selezione (è uscito
  dal flow, non si rivede).

---

## 7. Riassunto esecutivo per l'orchestratrice

In una riga: **il tab "Timer" diventa "Tabata", una brochure
divulgativa con un singolo CTA hold-to-start; "Intervalli" diventa
la schermata di config persistita; "Libero" esce e diventa un timer
pausa standalone affiancato al pulsante Spotify nella SportHome;
all'avvio overlay countdown 5→1 con suono+haptic; poi il workout
attuale**.

Effort stimato: medio-alto (~6-10h se in una sola sessione, valutare
split in 2 — es. C3.1 redesign Tabata, C3.2 timer pausa standalone +
ridisegno riga Spotify).

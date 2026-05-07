// Manifest canonico per la generazione delle illustrazioni esercizio.
//
// Per ogni esercizio in `src/database/seedExercises.ts` decidiamo:
// - slug         → nome del file PNG (assets/exercises/<slug>.png)
// - name         → corrisponde ESATTO al `name` nel seed (matching runtime)
// - strategy     → 'single' | 'dual' | 'triple' (numero di frame)
// - view         → 'lateral' | 'frontal' | 'three-quarter' | 'top-down'
// - character    → 'M' | 'F' (alternato per varietà visiva)
// - frames       → array di descrizioni concise (1, 2 o 3 a seconda della strategy)
// - notes        → opzionali, dettagli tecnici extra per il prompt
//
// Regola: lo stesso `slug` viene usato sia per il PNG sia per il lookup
// runtime nella mappa statica EXERCISE_IMAGES. Non rinominare slug dopo
// la generazione asset altrimenti perdi il match.

const MANIFEST = [
  // ─── GAMBE / GLUTEI (10) ──────────────────────────────────────
  {
    slug: 'squat',
    name: 'Squat',
    strategy: 'dual',
    view: 'lateral',
    character: 'F',
    frames: [
      'In piedi, schiena dritta, piedi alla larghezza delle spalle, punte leggermente in fuori, braccia rilassate lungo i fianchi.',
      'Posizione bassa: cosce parallele al pavimento, ginocchia piegate sopra le punte dei piedi, schiena dritta, busto leggermente inclinato in avanti, braccia distese in avanti per controbilanciare.',
    ],
  },
  {
    slug: 'affondi',
    name: 'Affondi',
    strategy: 'dual',
    view: 'lateral',
    character: 'M',
    frames: [
      'In piedi, busto eretto, piedi paralleli alla larghezza dei fianchi, braccia rilassate lungo i fianchi.',
      'Posizione di affondo: una gamba avanti col ginocchio piegato a 90°, ginocchio posteriore basso che sfiora il pavimento, busto eretto, mani sui fianchi.',
    ],
  },
  {
    slug: 'bulgarian-split-squat',
    name: 'Bulgarian split squat',
    strategy: 'dual',
    view: 'lateral',
    character: 'M',
    frames: [
      'In piedi davanti a una panca bassa, collo del piede posteriore appoggiato sulla panca, gamba anteriore tesa.',
      'Posizione bassa: ginocchio posteriore vicino al pavimento, ginocchio anteriore piegato a 90°, busto leggermente inclinato in avanti, mani sui fianchi.',
    ],
    notes: 'La panca/sedia è un rettangolo neutro grigio/nero (#1E2532) basso, vista laterale.',
  },
  {
    slug: 'wall-sit',
    name: 'Wall sit',
    strategy: 'single',
    view: 'lateral',
    character: 'F',
    frames: [
      'Schiena interamente appoggiata al muro (rappresentato come una linea verticale grigio-scura sul lato del frame), ginocchia piegate a 90°, cosce parallele al pavimento, piedi a terra alla larghezza dei fianchi, braccia rilassate lungo le cosce.',
    ],
    notes: 'Il muro è una linea verticale spessa #1E2532 dietro la persona, niente texture o motivi.',
  },
  {
    slug: 'calf-raise',
    name: 'Calf raise',
    strategy: 'dual',
    view: 'lateral',
    character: 'F',
    frames: [
      'In piedi rilassata, talloni a terra, piedi alla larghezza dei fianchi, braccia lungo i fianchi.',
      'Talloni sollevati al massimo, peso sulle punte dei piedi, polpacci contratti visibilmente più definiti, mani sui fianchi per equilibrio.',
    ],
  },
  {
    slug: 'single-leg-deadlift',
    name: 'Single-leg deadlift',
    strategy: 'dual',
    view: 'lateral',
    character: 'F',
    frames: [
      'In piedi su una gamba, l\'altra gamba leggermente sollevata dietro, busto eretto, braccia rilassate.',
      'Busto inclinato in avanti parallelo al pavimento dall\'anca, gamba libera estesa indietro tesa parallela al pavimento (formando una linea retta busto-gamba), braccia tese verso il pavimento.',
    ],
  },
  {
    slug: 'hip-thrust',
    name: 'Hip thrust',
    strategy: 'dual',
    view: 'lateral',
    character: 'M',
    frames: [
      'Scapole appoggiate al bordo di una panca bassa, bacino vicino al pavimento, ginocchia piegate a circa 90°, piedi a terra.',
      'Bacino sollevato fino ad allineare ginocchia, anche e spalle in linea retta orizzontale, glutei contratti, piedi piantati a terra.',
    ],
    notes: 'La panca è un rettangolo neutro #1E2532 basso visto di lato.',
  },
  {
    slug: 'glute-bridge',
    name: 'Glute bridge',
    strategy: 'dual',
    view: 'lateral',
    character: 'F',
    frames: [
      'Distesa supina sul pavimento, ginocchia piegate, piedi vicini ai glutei a terra, braccia distese lungo i fianchi a terra.',
      'Bacino sollevato verso l\'alto, ponte completo: linea retta tra ginocchia, anche e spalle, glutei contratti, piedi e spalle ancora a terra.',
    ],
  },
  {
    slug: 'step-up',
    name: 'Step-up',
    strategy: 'dual',
    view: 'lateral',
    character: 'M',
    frames: [
      'In piedi davanti a una panca bassa, busto eretto, un piede appoggiato pieno sulla panca, l\'altra gamba a terra.',
      'In piedi sopra la panca con un piede pieno, l\'altra gamba sollevata col ginocchio a 90° (non appoggiata), busto eretto, braccia naturali.',
    ],
    notes: 'La panca/sedia è un rettangolo basso #1E2532 vista laterale.',
  },
  {
    slug: 'sumo-squat',
    name: 'Sumo squat',
    strategy: 'dual',
    view: 'frontal',
    character: 'F',
    frames: [
      'In piedi vista frontale, piedi più larghi delle spalle, punte ruotate verso l\'esterno (~45°), braccia rilassate.',
      'Squat profondo vista frontale, cosce parallele al pavimento, ginocchia in linea con le punte dei piedi, busto eretto, mani giunte davanti al petto.',
    ],
    notes: 'Vista frontale è importante per mostrare l\'apertura delle punte dei piedi.',
  },

  // ─── PETTO / SPALLE / TRICIPITI (7) ──────────────────────────
  {
    slug: 'push-up',
    name: 'Push-up',
    strategy: 'dual',
    view: 'lateral',
    character: 'M',
    frames: [
      'Posizione alta: braccia tese, mani a terra alla larghezza delle spalle, corpo allineato in linea retta da testa a talloni, core attivo.',
      'Posizione bassa: gomiti piegati, petto vicino al pavimento, corpo ancora allineato in linea retta, mani sotto le spalle.',
    ],
  },
  {
    slug: 'push-up-declinati',
    name: 'Push-up declinati',
    strategy: 'dual',
    view: 'lateral',
    character: 'M',
    frames: [
      'Posizione alta: punte dei piedi sopra una panca bassa, mani a terra alla larghezza delle spalle, braccia tese, corpo in linea retta inclinata (testa più bassa dei piedi).',
      'Posizione bassa: gomiti piegati, petto vicino al pavimento, piedi ancora sulla panca, corpo ancora in linea retta inclinata.',
    ],
    notes: 'La panca è un rettangolo basso #1E2532 vista laterale, sotto i piedi.',
  },
  {
    slug: 'diamond-push-up',
    name: 'Diamond push-up',
    strategy: 'dual',
    view: 'three-quarter',
    character: 'M',
    frames: [
      'Posizione alta: mani a terra ravvicinate sotto il petto, indici e pollici che si toccano formando un rombo visibile, braccia tese, corpo allineato.',
      'Posizione bassa: gomiti piegati e tenuti vicini al busto, petto sfiora le mani che restano nel rombo, corpo allineato.',
    ],
    notes: 'Vista a 3/4 dall\'alto-davanti per mostrare chiaramente il rombo formato dalle mani.',
  },
  {
    slug: 'pike-push-up',
    name: 'Pike push-up',
    strategy: 'dual',
    view: 'lateral',
    character: 'M',
    frames: [
      'Posizione di partenza: corpo a "V rovesciata" — bacino alto, gambe tese, mani a terra alla larghezza delle spalle, sguardo verso i piedi.',
      'Posizione bassa: gomiti piegati, testa che sfiora il pavimento davanti alle mani, bacino ancora alto, gambe ancora tese.',
    ],
  },
  {
    slug: 'tricep-dip',
    name: 'Tricep dip',
    strategy: 'dual',
    view: 'lateral',
    character: 'F',
    frames: [
      'Posizione alta: mani sul bordo di una panca bassa dietro la schiena, glutei staccati dalla panca avanti, gambe estese in avanti coi talloni a terra, braccia tese.',
      'Posizione bassa: gomiti piegati a 90° dritti all\'indietro, glutei vicino al pavimento davanti alla panca, busto eretto, spalle basse.',
    ],
    notes: 'La panca è un rettangolo basso #1E2532 vista laterale, dietro la persona.',
  },
  {
    slug: 'wide-push-up',
    name: 'Wide push-up',
    strategy: 'dual',
    view: 'frontal',
    character: 'M',
    frames: [
      'Posizione alta vista frontale: mani a terra molto più larghe delle spalle, braccia tese, corpo allineato, sguardo poco avanti alle mani.',
      'Posizione bassa vista frontale: gomiti aperti verso l\'esterno, petto vicino al pavimento, mani ancora larghe.',
    ],
    notes: 'Vista frontale leggermente angolata per mostrare la larghezza delle mani.',
  },
  {
    slug: 'plank-to-push-up',
    name: 'Plank to push-up',
    strategy: 'dual',
    view: 'lateral',
    character: 'M',
    frames: [
      'Plank basso sugli avambracci: avambracci a terra paralleli, gomiti sotto le spalle, corpo allineato, core attivo.',
      'Posizione di push-up alta: braccia tese, palmi a terra sotto le spalle, corpo ancora allineato, transizione completata.',
    ],
  },

  // ─── CORE (8) ─────────────────────────────────────────────────
  {
    slug: 'plank',
    name: 'Plank',
    strategy: 'single',
    view: 'lateral',
    character: 'F',
    frames: [
      'Plank sugli avambracci: avambracci a terra paralleli, gomiti sotto le spalle, corpo perfettamente allineato in linea retta dalla testa ai talloni, sguardo al pavimento, core attivo, glutei contratti.',
    ],
  },
  {
    slug: 'side-plank',
    name: 'Side plank',
    strategy: 'single',
    view: 'lateral',
    character: 'F',
    frames: [
      'Plank laterale: su un fianco, avambraccio inferiore a terra sotto la spalla, bacino sollevato in linea retta dalla testa ai piedi, mano superiore appoggiata sull\'anca, gambe sovrapposte, sguardo avanti.',
    ],
  },
  {
    slug: 'crunch',
    name: 'Crunch',
    strategy: 'dual',
    view: 'lateral',
    character: 'F',
    frames: [
      'Posizione di partenza: distesa supina, ginocchia piegate e piedi appoggiati a terra, mani dietro la testa coi gomiti aperti, schiena a terra.',
      'Posizione contratta: spalle e parte alta della schiena sollevate dal pavimento, addominali contratti, lombari ancora a terra, mento non incollato al petto.',
    ],
  },
  {
    slug: 'russian-twist',
    name: 'Russian twist',
    strategy: 'dual',
    view: 'three-quarter',
    character: 'F',
    frames: [
      'Posizione centro: seduta, ginocchia piegate, busto inclinato indietro a 45°, piedi appoggiati o leggermente sollevati, mani giunte davanti al petto, busto centrato.',
      'Posizione ruotata: stessa postura ma busto ruotato lateralmente, mani giunte portate vicino al fianco di un lato, gambe ferme.',
    ],
    notes: 'Vista a 3/4 dall\'alto per leggere chiaramente la rotazione del busto.',
  },
  {
    slug: 'hollow-hold',
    name: 'Hollow hold',
    strategy: 'single',
    view: 'lateral',
    character: 'M',
    frames: [
      'Posizione "scafo": disteso supino con lombari schiacciati al pavimento, spalle e gambe tese sollevate vicino al pavimento (non a terra), braccia tese sopra la testa allineate col corpo, sguardo tra le punte dei piedi, corpo a forma di banana rovesciata.',
    ],
  },
  {
    slug: 'bird-dog',
    name: 'Bird-dog',
    strategy: 'dual',
    view: 'lateral',
    character: 'F',
    frames: [
      'Quadrupedia neutra: mani sotto le spalle, ginocchia sotto i fianchi, schiena piatta, sguardo al pavimento.',
      'Estensione controlaterale: braccio destro esteso in avanti orizzontale, gamba sinistra estesa indietro orizzontale, formando una linea retta dalla mano al piede, bacino stabile.',
    ],
  },
  {
    slug: 'dead-bug',
    name: 'Dead bug',
    strategy: 'dual',
    view: 'lateral',
    character: 'M',
    frames: [
      'Posizione di partenza: supino, braccia tese verticali verso il soffitto, ginocchia piegate a 90° con cosce verticali (gambe come "tavolino").',
      'Estensione controlaterale: braccio sinistro esteso dietro la testa vicino al pavimento, gamba destra estesa avanti tesa vicino al pavimento, lombari schiacciati a terra, l\'altro braccio e gamba ancora in posizione neutra.',
    ],
  },
  {
    slug: 'leg-raise',
    name: 'Leg raise',
    strategy: 'dual',
    view: 'lateral',
    character: 'M',
    frames: [
      'Gambe alte: supino, gambe tese unite sollevate verticali a 90° col busto, mani lungo i fianchi a terra, lombari aderenti.',
      'Gambe basse: gambe tese unite vicine al pavimento (non appoggiate), corpo ancora supino, lombari ancora a terra.',
    ],
  },

  // ─── CARDIO / FULL BODY (6) ──────────────────────────────────
  {
    slug: 'burpees',
    name: 'Burpees',
    strategy: 'triple',
    view: 'lateral',
    character: 'M',
    frames: [
      'Squat con mani a terra: piedi alla larghezza delle spalle, mani appoggiate al pavimento davanti ai piedi, busto piegato.',
      'Posizione di plank alta: corpo allineato in linea retta, braccia tese, mani a terra, piedi indietro, dopo il salto indietro.',
      'Salto verticale: in piedi, braccia tese sopra la testa, piedi staccati dal pavimento in fase di salto.',
    ],
    notes: 'I 3 frame mostrano la sequenza completa: squat→plank→salto. Disposti orizzontalmente da sinistra a destra.',
  },
  {
    slug: 'mountain-climber',
    name: 'Mountain climber',
    strategy: 'dual',
    view: 'lateral',
    character: 'F',
    frames: [
      'Plank alta con ginocchio destro tirato avanti vicino al petto, piede destro vicino alla mano destra, gamba sinistra ancora estesa indietro, braccia tese.',
      'Plank alta con ginocchio sinistro tirato avanti vicino al petto, gamba destra ora estesa indietro: posizione speculare alla precedente.',
    ],
  },
  {
    slug: 'jumping-jacks',
    name: 'Jumping jacks',
    strategy: 'dual',
    view: 'frontal',
    character: 'F',
    frames: [
      'Posizione chiusa vista frontale: piedi uniti, braccia distese lungo i fianchi.',
      'Posizione aperta vista frontale: gambe aperte ai lati (più larghe delle spalle), braccia tese sopra la testa che si toccano, in fase di salto leggero.',
    ],
  },
  {
    slug: 'high-knees',
    name: 'High knees',
    strategy: 'dual',
    view: 'frontal',
    character: 'M',
    frames: [
      'Vista frontale: ginocchio destro sollevato all\'altezza del fianco a 90°, piede sinistro a terra, braccia in movimento alternato (sinistra avanti, destra indietro).',
      'Vista frontale speculare: ginocchio sinistro alto, piede destro a terra, braccia invertite.',
    ],
  },
  {
    slug: 'skater-jumps',
    name: 'Skater jumps',
    strategy: 'dual',
    view: 'frontal',
    character: 'M',
    frames: [
      'Atterraggio sulla gamba destra dopo un salto laterale: gamba destra leggermente piegata che regge il peso, gamba sinistra appoggiata dietro per equilibrio (incrociata), busto leggermente flesso in avanti, braccia oscillate per equilibrio.',
      'Atterraggio speculare sulla gamba sinistra: posizione invertita rispetto al frame 1.',
    ],
  },
  {
    slug: 'squat-jumps',
    name: 'Squat jumps',
    strategy: 'dual',
    view: 'lateral',
    character: 'M',
    frames: [
      'Squat profondo di partenza: cosce parallele al pavimento, busto leggermente inclinato avanti, braccia indietro per slancio.',
      'Salto verticale: corpo teso ed esteso, piedi staccati dal pavimento, braccia distese sopra la testa per slancio.',
    ],
  },

  // ─── MOBILITÀ (7) ─────────────────────────────────────────────
  {
    slug: 'cat-cow',
    name: 'Schiena - Cat-cow',
    strategy: 'dual',
    view: 'lateral',
    character: 'F',
    frames: [
      '"Cow": in quadrupedia, schiena inarcata verso il basso (lombare in lordosi), addome verso il pavimento, sguardo verso l\'alto, mani sotto le spalle e ginocchia sotto i fianchi.',
      '"Cat": in quadrupedia, schiena arrotondata verso l\'alto (gobba), mento verso il petto, addome retratto, mani e ginocchia in stessa posizione.',
    ],
  },
  {
    slug: 'cobra',
    name: 'Schiena - Cobra',
    strategy: 'single',
    view: 'lateral',
    character: 'F',
    frames: [
      'Posizione cobra: prona a terra, mani sotto le spalle coi gomiti vicini al busto, petto e spalle sollevati con braccia parzialmente tese, bacino e gambe ancora a terra, sguardo leggermente verso l\'alto, collo lungo.',
    ],
  },
  {
    slug: 'child-pose',
    name: 'Schiena - Child pose',
    strategy: 'single',
    view: 'lateral',
    character: 'F',
    frames: [
      'Posizione del bambino: in ginocchio con glutei appoggiati sui talloni, busto piegato in avanti, fronte appoggiata al pavimento, braccia distese in avanti sul pavimento, posizione di riposo.',
    ],
  },
  {
    slug: 'downward-dog',
    name: 'Full body - Downward dog',
    strategy: 'single',
    view: 'lateral',
    character: 'F',
    frames: [
      'Cane a testa in giù: corpo a "V rovesciata" con bacino alto, gambe tese e talloni che cercano il pavimento, braccia tese in avanti, mani a terra, testa rilassata tra le braccia, sguardo tra i piedi.',
    ],
  },
  {
    slug: 'hip-circles',
    name: 'Anche - Hip circles',
    strategy: 'single',
    view: 'three-quarter',
    character: 'F',
    frames: [
      'In quadrupedia (mani sotto le spalle, ginocchio destro sotto il fianco), ginocchio sinistro sollevato lateralmente a 90° all\'altezza del bacino, in posizione "centrale" del cerchio, bacino stabile, sguardo al pavimento.',
    ],
    notes: 'Vista a 3/4 dal lato per mostrare l\'apertura laterale dell\'anca. Niente frecce a indicare il movimento — solo la posizione.',
  },
  {
    slug: 'shoulder-rolls',
    name: 'Spalle - Shoulder rolls',
    strategy: 'dual',
    view: 'frontal',
    character: 'M',
    frames: [
      'Posizione bassa: in piedi vista frontale, braccia rilassate lungo i fianchi, spalle in posizione neutra verso il basso.',
      'Posizione alta: in piedi vista frontale, spalle sollevate verso le orecchie e leggermente arretrate, braccia ancora rilassate, in fase di rotazione.',
    ],
  },
  {
    slug: 'pigeon-pose',
    name: 'Anche - Pigeon pose',
    strategy: 'single',
    view: 'three-quarter',
    character: 'F',
    frames: [
      'Posizione del piccione: gamba destra avanti con ginocchio piegato sotto al busto e tibia perpendicolare al corpo, gamba sinistra estesa diritta indietro col collo del piede a terra, busto inclinato in avanti sull\'anca anteriore, mani appoggiate a terra davanti.',
    ],
    notes: 'Vista a 3/4 per mostrare sia l\'angolazione del ginocchio anteriore sia l\'estensione della gamba posteriore.',
  },

  // ─── STRETCHING (4) ───────────────────────────────────────────
  {
    slug: 'hamstring-stretch',
    name: 'Hamstring stretch',
    strategy: 'single',
    view: 'lateral',
    character: 'F',
    frames: [
      'Allungamento posteriori coscia da seduta: seduta a terra con gamba destra tesa in avanti (parallela al pavimento), gamba sinistra piegata col piede appoggiato al ginocchio destro, busto inclinato in avanti dall\'anca, mani che cercano la punta del piede destro, schiena lunga (non curva).',
    ],
  },
  {
    slug: 'quad-stretch',
    name: 'Quad stretch',
    strategy: 'single',
    view: 'lateral',
    character: 'F',
    frames: [
      'Allungamento quadricipite in piedi: in piedi su una gamba (quella sinistra a terra), gamba destra piegata indietro col tallone vicino al gluteo, mano destra che afferra il dorso del piede destro tirandolo verso il gluteo, mano sinistra appoggiata a una parete-linea per equilibrio, busto eretto.',
    ],
  },
  {
    slug: 'chest-opener',
    name: 'Chest opener',
    strategy: 'single',
    view: 'three-quarter',
    character: 'F',
    frames: [
      'Apertura del petto: in piedi vista a 3/4, braccia distese dietro la schiena con dita intrecciate, scapole avvicinate, petto aperto verso l\'alto, sguardo leggermente sollevato, busto eretto.',
    ],
  },
  {
    slug: 'spinal-twist',
    name: 'Spinal twist',
    strategy: 'single',
    view: 'top-down',
    character: 'F',
    frames: [
      'Torsione spinale supina vista dall\'alto: distesa supina con braccia a croce ai lati (a 90° dal busto), un ginocchio piegato e portato verso il lato opposto del corpo a terra, l\'altra gamba tesa a terra, sguardo verso la mano del lato opposto a quello in cui è ruotato il ginocchio.',
    ],
    notes: 'Vista dall\'alto (top-down) per mostrare chiaramente la torsione del busto e la croce delle braccia.',
  },

  // ─── SCHIENA / DORSALI (5) ───────────────────────────────────
  {
    slug: 'superman',
    name: 'Superman',
    strategy: 'dual',
    view: 'lateral',
    character: 'M',
    frames: [
      'Posizione di partenza: prono a terra, braccia tese in avanti col palmi a terra, gambe distese unite, fronte a terra.',
      'Posizione contratta: braccia tese sollevate dal pavimento, petto e spalle sollevati, gambe sollevate dal pavimento, glutei e lombari contratti, corpo che forma una leggera curva concava.',
    ],
  },
  {
    slug: 'reverse-snow-angel',
    name: 'Reverse snow angel',
    strategy: 'dual',
    view: 'top-down',
    character: 'F',
    frames: [
      'Posizione di partenza vista dall\'alto: prona, braccia tese lungo i fianchi coi palmi rivolti verso l\'alto, gambe distese unite.',
      'Posizione finale vista dall\'alto: braccia tese ad arco sopra la testa (formando una "Y"), ancora leggermente sollevate dal pavimento, scapole attive, gambe ferme.',
    ],
    notes: 'Vista dall\'alto per leggere chiaramente l\'arco descritto dalle braccia.',
  },
  {
    slug: 'rematore-bottiglie',
    name: 'Rematore con bottiglie',
    strategy: 'dual',
    view: 'lateral',
    character: 'M',
    frames: [
      'Posizione di partenza: in piedi col busto inclinato in avanti a 45° dalle anche, schiena dritta, ginocchia leggermente piegate, una bottiglia piena (#FF7A1A arancio) per mano con braccia tese verso il pavimento.',
      'Posizione contratta: gomiti tirati indietro lungo il busto, scapole avvicinate, bottiglie vicine al busto, schiena ancora dritta.',
    ],
    notes: 'Le bottiglie sono semplici cilindri arancio (#FF7A1A) con tappo scuro — niente etichette, niente brand.',
  },
  {
    slug: 'pull-apart-elastico',
    name: 'Pull-apart con elastico',
    strategy: 'dual',
    view: 'frontal',
    character: 'F',
    frames: [
      'Posizione di partenza vista frontale: in piedi, braccia tese in avanti all\'altezza delle spalle, mani vicine che afferrano un elastico (linea sottile #FF7A1A) con leggera tensione iniziale.',
      'Posizione finale vista frontale: braccia tese aperte ai lati a "T", scapole avvicinate, elastico steso al massimo davanti al petto.',
    ],
    notes: 'L\'elastico è una linea curva sottile arancio (#FF7A1A) tesa tra le mani.',
  },
  {
    slug: 'trazioni-assistite',
    name: 'Trazioni assistite con elastico',
    strategy: 'dual',
    view: 'frontal',
    character: 'M',
    frames: [
      'Posizione di partenza vista frontale: appeso a una sbarra orizzontale alta (linea spessa #1E2532 in alto), braccia tese, presa prona alla larghezza delle spalle, un piede infilato in un elastico (linea #FF7A1A) agganciato alla sbarra che pende verso il basso, corpo verticale.',
      'Posizione contratta vista frontale: petto vicino alla sbarra, gomiti piegati ai lati del busto, ancora con piede nell\'elastico.',
    ],
    notes: 'La sbarra è una linea orizzontale spessa #1E2532 in alto. L\'elastico è una linea sottile #FF7A1A.',
  },

  // ─── BICIPITI (2) ──────────────────────────────────────────────
  {
    slug: 'curl-bottiglie',
    name: 'Curl con bottiglie',
    strategy: 'dual',
    view: 'lateral',
    character: 'F',
    frames: [
      'Posizione bassa: in piedi vista laterale, una bottiglia piena (#FF7A1A) per mano, braccia distese lungo i fianchi coi palmi rivolti in avanti, gomiti vicini al busto.',
      'Posizione alta: bottiglie sollevate verso le spalle, gomiti piegati a circa 30° (non completi sulle spalle), gomiti ancora vicini al busto, busto fermo.',
    ],
    notes: 'Bottiglie come cilindri arancio (#FF7A1A) col tappo scuro, niente etichette.',
  },
  {
    slug: 'curl-isometrico-asciugamano',
    name: 'Curl isometrico con asciugamano',
    strategy: 'single',
    view: 'lateral',
    character: 'M',
    frames: [
      'In piedi vista laterale, un asciugamano (rettangolo allungato grigio chiaro #FFE0C8) passa sotto un piede a terra, le due estremità tenute dalle mani, gomiti piegati a 90° vicini al busto, palmi rivolti verso l\'alto, espressione di tensione nel tirare contro il piede stabile, posizione statica.',
    ],
    notes: 'L\'asciugamano è un rettangolo allungato in tono pesca/beige #FFE0C8 con leggera ombreggiatura.',
  },

  // ─── SPALLE (2) ────────────────────────────────────────────────
  {
    slug: 'shoulder-taps',
    name: 'Shoulder taps',
    strategy: 'dual',
    view: 'three-quarter',
    character: 'F',
    frames: [
      'Plank alta neutra: braccia tese, mani sotto le spalle, corpo allineato, entrambe le mani a terra.',
      'Tocco spalla opposta: una mano sollevata che tocca la spalla del lato opposto, l\'altra mano ancora a terra, bacino stabile (non ruotato), corpo ancora allineato.',
    ],
    notes: 'Vista a 3/4 dall\'alto per leggere chiaramente il tocco della spalla opposta.',
  },
  {
    slug: 'y-t-w-prone',
    name: 'Y-T-W prone',
    strategy: 'triple',
    view: 'top-down',
    character: 'M',
    frames: [
      'Posizione "Y" vista dall\'alto: prono a terra, fronte appoggiata, braccia tese aperte a 45° dal busto formando una Y, leggermente sollevate dal pavimento.',
      'Posizione "T" vista dall\'alto: prono, braccia tese aperte ai lati a 90° dal busto formando una T, ancora leggermente sollevate.',
      'Posizione "W" vista dall\'alto: prono, gomiti piegati vicino al busto e mani sollevate ai lati della testa formando una W, ancora leggermente sollevate.',
    ],
    notes: 'I 3 frame disposti orizzontalmente da sinistra a destra. Vista dall\'alto per leggere chiaramente le forme delle braccia. Niente lettere "Y T W" scritte nell\'immagine.',
  },

  // ─── GLUTEI (3) ────────────────────────────────────────────────
  {
    slug: 'clamshell',
    name: 'Clamshell',
    strategy: 'dual',
    view: 'lateral',
    character: 'F',
    frames: [
      'Posizione chiusa: distesa su un fianco, ginocchia piegate a 90° con talloni in linea coi glutei, testa appoggiata sul braccio inferiore, ginocchia unite, bacino stabile.',
      'Posizione aperta: stesso decubito laterale, ginocchio superiore aperto verso l\'alto (apertura "a conchiglia"), piedi ancora uniti, bacino ancora stabile (non ruotato).',
    ],
  },
  {
    slug: 'donkey-kick',
    name: 'Donkey kick',
    strategy: 'dual',
    view: 'lateral',
    character: 'F',
    frames: [
      'Posizione di partenza: in quadrupedia, mani sotto le spalle, ginocchia sotto i fianchi, schiena piatta.',
      'Posizione di calcio: una gamba sollevata col tallone verso il soffitto, ginocchio ancora piegato a 90°, gluteo contratto, bacino stabile, schiena ancora piatta.',
    ],
  },
  {
    slug: 'fire-hydrant',
    name: 'Fire hydrant',
    strategy: 'dual',
    view: 'three-quarter',
    character: 'F',
    frames: [
      'Posizione di partenza: in quadrupedia vista a 3/4 da dietro, mani sotto le spalle, ginocchia sotto i fianchi.',
      'Apertura laterale: una gamba sollevata lateralmente col ginocchio ancora piegato a 90°, all\'altezza del bacino (come un cane che alza la zampa), busto stabile non ruotato.',
    ],
    notes: 'Vista a 3/4 da dietro per mostrare chiaramente l\'apertura laterale dell\'anca.',
  },

  // ─── GAMBE VARIANTI (3) ──────────────────────────────────────
  {
    slug: 'lateral-lunge',
    name: 'Lateral lunge',
    strategy: 'dual',
    view: 'frontal',
    character: 'M',
    frames: [
      'In piedi vista frontale: piedi alla larghezza dei fianchi, busto eretto, braccia rilassate.',
      'Affondo laterale: passo ampio di lato (es. a destra), ginocchio destro piegato col peso sul tallone destro, gamba sinistra tesa, busto leggermente inclinato in avanti, mani giunte davanti al petto.',
    ],
  },
  {
    slug: 'cossack-squat',
    name: 'Cossack squat',
    strategy: 'dual',
    view: 'frontal',
    character: 'M',
    frames: [
      'Posizione di partenza vista frontale: piedi più larghi delle spalle, punte leggermente in fuori, busto eretto, braccia tese in avanti per equilibrio.',
      'Squat laterale profondo: peso su una gamba (es. destra) col ginocchio piegato e gluteo basso, l\'altra gamba (sinistra) tesa di lato con punta del piede sollevata verso l\'alto, busto inclinato in avanti, braccia ancora tese avanti.',
    ],
  },
  {
    slug: 'goblet-squat-bottiglia',
    name: 'Goblet squat con bottiglia',
    strategy: 'dual',
    view: 'lateral',
    character: 'F',
    frames: [
      'In piedi: una bottiglia piena (#FF7A1A) tenuta al petto con entrambe le mani, gomiti bassi, piedi alla larghezza delle spalle.',
      'Squat profondo: cosce parallele al pavimento, ginocchia in linea con le punte, busto eretto, bottiglia ancora al petto.',
    ],
    notes: 'Bottiglia come cilindro arancio #FF7A1A con tappo scuro.',
  },

  // ─── STACCHI VARIANTI (2) ────────────────────────────────────
  {
    slug: 'romanian-deadlift-bottiglie',
    name: 'Romanian deadlift con bottiglie',
    strategy: 'dual',
    view: 'lateral',
    character: 'F',
    frames: [
      'Posizione alta: in piedi, una bottiglia piena (#FF7A1A) per mano davanti alle cosce, braccia tese, ginocchia leggermente piegate, busto eretto.',
      'Posizione bassa: busto inclinato in avanti dall\'anca, schiena dritta, ginocchia ancora leggermente piegate, bottiglie scese lungo le gambe fino al ginocchio (allungamento posteriori).',
    ],
    notes: 'Bottiglie come cilindri arancio #FF7A1A.',
  },
  {
    slug: 'good-morning',
    name: 'Good morning',
    strategy: 'dual',
    view: 'lateral',
    character: 'M',
    frames: [
      'Posizione alta: in piedi vista laterale, mani dietro la testa coi gomiti aperti, ginocchia leggermente piegate, busto eretto.',
      'Posizione bassa: busto inclinato in avanti dall\'anca quasi parallelo al pavimento, schiena dritta, ginocchia ancora leggermente piegate, mani ancora dietro la testa.',
    ],
  },

  // ─── PLIOMETRIA (2) ──────────────────────────────────────────
  {
    slug: 'tuck-jump',
    name: 'Tuck jump',
    strategy: 'dual',
    view: 'lateral',
    character: 'M',
    frames: [
      'Squat di partenza: piedi alla larghezza delle spalle, ginocchia leggermente piegate, braccia indietro per slancio.',
      'Salto con ginocchia al petto: in aria, ginocchia tirate verso il petto, mani che si avvicinano alle ginocchia, corpo compatto, piedi ben staccati dal pavimento.',
    ],
  },
  {
    slug: 'broad-jump',
    name: 'Broad jump',
    strategy: 'dual',
    view: 'lateral',
    character: 'M',
    frames: [
      'Posizione di partenza: piedi alla larghezza dei fianchi, leggero squat, busto inclinato in avanti, braccia tese indietro pronte allo slancio.',
      'Atterraggio in avanti: in posizione di squat sostenuta, braccia in avanti, busto leggermente inclinato avanti, piedi a terra dopo essersi spostato in avanti rispetto al frame 1.',
    ],
    notes: 'Tra i due frame c\'è uno spazio orizzontale che suggerisce il salto in lungo.',
  },

  // ─── ESERCIZI SEDUTI (3) ─────────────────────────────────────
  {
    slug: 'marcia-seduti',
    name: 'Marcia da seduti',
    strategy: 'dual',
    view: 'lateral',
    character: 'F',
    frames: [
      'Seduta su una sedia stabile vista laterale, schiena dritta, entrambi i piedi a terra, mani sui fianchi.',
      'Stessa sedia, un ginocchio sollevato verso il petto (la coscia si avvicina al busto), l\'altro piede ancora a terra, schiena dritta, braccio opposto al ginocchio leggermente avanti.',
    ],
    notes: 'La sedia è un rettangolo neutro #1E2532 con schienale visto di lato.',
  },
  {
    slug: 'alzata-gambe-seduti',
    name: 'Alzata gambe da seduti',
    strategy: 'dual',
    view: 'lateral',
    character: 'F',
    frames: [
      'Seduta su una sedia stabile, schiena appoggiata allo schienale, entrambe le gambe piegate a 90° coi piedi a terra, mani sui braccioli o sulle cosce.',
      'Una gamba estesa parallela al pavimento (quadricipite contratto), l\'altra gamba ancora a 90° coi piede a terra, schiena ancora appoggiata, mani ferme.',
    ],
    notes: 'Sedia come rettangolo #1E2532 con schienale visibile, vista laterale.',
  },
  {
    slug: 'twist-seduti',
    name: 'Twist da seduti',
    strategy: 'dual',
    view: 'three-quarter',
    character: 'F',
    frames: [
      'Posizione neutra: seduta su sedia stabile, schiena eretta, mani giunte davanti al petto, piedi a terra.',
      'Posizione ruotata: stessa postura ma busto ruotato lateralmente, mani giunte ancora davanti al petto ma rivolte verso il lato, bacino e gambe ferme.',
    ],
    notes: 'Vista a 3/4 dall\'alto per leggere la rotazione del busto.',
  },

  // ─── CALISTENICO — REGRESSIONI E BASI PRINCIPIANTI (5) ─────────
  {
    slug: 'push-up-ginocchia',
    name: 'Push-up sui ginocchi',
    strategy: 'dual',
    view: 'lateral',
    character: 'F',
    frames: [
      'Posizione alta: mani a terra alla larghezza delle spalle, braccia tese, ginocchia a terra con caviglie incrociate sollevate, corpo allineato in linea retta dalla testa alle ginocchia, core attivo.',
      'Posizione bassa: gomiti piegati, petto vicino al pavimento, corpo ancora allineato dalla testa alle ginocchia, ginocchia ancora a terra.',
    ],
    notes: 'Fondamentale che il corpo formi una linea retta da testa a ginocchia (non seduta/arco) in entrambi i frame.',
  },
  {
    slug: 'push-up-inclinati',
    name: 'Push-up inclinati',
    strategy: 'dual',
    view: 'lateral',
    character: 'M',
    frames: [
      'Posizione alta: mani sul bordo di una panca bassa (#1E2532) o sedia stabile, braccia tese, piedi a terra distanziati, corpo inclinato in linea retta dalle spalle ai talloni con testa più alta dei piedi.',
      'Posizione bassa: gomiti piegati, petto sfiorava il bordo della panca, corpo ancora in linea retta inclinata, piedi fermi a terra.',
    ],
    notes: 'La panca è un rettangolo basso #1E2532 vista laterale su cui poggiano le mani. L\'inclinazione deve essere evidente (mani alte, piedi bassi).',
  },
  {
    slug: 'dead-hang',
    name: 'Dead hang',
    strategy: 'single',
    view: 'frontal',
    character: 'F',
    frames: [
      'Vista frontale: appesa a una sbarra orizzontale spessa (#1E2532) in alto al centro dell\'immagine, presa prona alla larghezza delle spalle, braccia completamente distese, corpo verticale con piedi staccati da terra, spalle aperte e attive (non shrugged), gambe unite e rilassate.',
    ],
    notes: 'La sbarra è una linea orizzontale spessa #1E2532 in cima all\'immagine. Vista frontale per leggere la verticalità e la presa.',
  },
  {
    slug: 'scapular-pull',
    name: 'Scapular pull',
    strategy: 'dual',
    view: 'frontal',
    character: 'M',
    frames: [
      'Posizione di partenza vista frontale: appeso a una sbarra orizzontale spessa (#1E2532), braccia completamente distese, scapole rilassate/elevate, corpo verticale, piedi staccati da terra.',
      'Posizione contratta vista frontale: stessa posizione appesa ma scapole abbassate e retratte (corpo salito di pochi centimetri visibili), braccia ancora completamente tese — NESSUNA flessione del gomito, solo movimento scapolare.',
    ],
    notes: 'La differenza tra i due frame deve essere inequivocabile: frame 1 = spalle vicine alle orecchie, frame 2 = spalle abbassate con leggero sollevamento del busto. Braccia TESE in entrambi.',
  },
  {
    slug: 'glute-bridge-una-gamba',
    name: 'Glute bridge a una gamba',
    strategy: 'dual',
    view: 'lateral',
    character: 'F',
    frames: [
      'Posizione di partenza: distesa supina, una gamba piegata col piede a terra vicino al gluteo, l\'altra gamba estesa tesa verso l\'alto a circa 45°, braccia lungo i fianchi, bacino a terra.',
      'Posizione contratta: bacino sollevato formando una linea retta da spalla a ginocchio della gamba piegata, gluteo contratto, gamba estesa ancora tesa in linea col busto (parallela al pavimento o leggermente sopra), bacino livellato senza inclinazioni laterali.',
    ],
    notes: 'La differenza tra i frame deve essere netta: bacino a terra vs bacino alto. La gamba estesa rimane tesa e parallela al pavimento nel frame 2.',
  },

  // ─── MOBILITÀ (3 finali) ─────────────────────────────────────
  {
    slug: 'leg-swings',
    name: 'Anche - Leg swings',
    strategy: 'dual',
    view: 'lateral',
    character: 'M',
    frames: [
      'Gamba avanti: in piedi laterale, una mano in appoggio a una linea verticale (parete) per equilibrio, una gamba tesa sollevata in avanti all\'altezza del bacino o più, l\'altra gamba a terra.',
      'Gamba indietro: stessa postura, ma la gamba ora estesa indietro (oscillazione opposta), busto leggermente inclinato avanti per controbilanciare.',
    ],
    notes: 'La parete è una linea verticale spessa #1E2532 sul lato dell\'immagine.',
  },
  {
    slug: 'wrist-circles',
    name: 'Polsi - Wrist circles',
    strategy: 'single',
    view: 'frontal',
    character: 'M',
    frames: [
      'Vista frontale ravvicinata sulle braccia: in piedi (busto e testa visibili nella parte alta), braccia tese in avanti all\'altezza delle spalle, pugni chiusi, polsi in posizione neutra in mezzo a un cerchio (la posizione mostrata è il "centro" del cerchio di rotazione), spalle rilassate.',
    ],
    notes: 'Inquadratura un po\' più stretta del solito per dare risalto a mani e polsi.',
  },
  {
    slug: 'ankle-circles',
    name: 'Caviglie - Ankle circles',
    strategy: 'single',
    view: 'three-quarter',
    character: 'M',
    frames: [
      'Seduto su una sedia stabile vista a 3/4, schiena dritta, una gamba estesa col piede sollevato dal pavimento (a circa 20-30 cm), la punta del piede orientata in posizione centrale del cerchio di rotazione, l\'altra gamba a 90° col piede a terra, mani sui braccioli.',
    ],
    notes: 'Vista a 3/4 per evidenziare il piede sollevato. La sedia è un rettangolo neutro #1E2532.',
  },
];

module.exports = { MANIFEST };

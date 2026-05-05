#!/usr/bin/env node
// Genera i file batch di rifacimento per gli esercizi presenti nella
// lista da-rifare.md. Ogni prompt viene costruito a partire dal manifest
// originale + un blocco "RINFORZO CRITICO" che evidenzia il difetto del
// primo tentativo e quali aspetti enfatizzare nella nuova generazione.
//
// Uso:
//   node scripts/exercise-illustrations/generate-rifare.js
//
// Output: scripts/exercise-illustrations/batches/rifare-NN.md

const fs = require('fs');
const path = require('path');

const { MANIFEST } = require('./manifest');
const { buildPrompt } = require('./template');

const OUTPUT_DIR = path.join(__dirname, 'batches');

// Lista esercizi da rifare, in ordine di severità (gravi prima, poi
// borderline). Il rinforzo è specifico del difetto riscontrato nel
// primo tentativo.
const RIFARE = [
  // ─── GRAVI (esercizio sbagliato o non leggibile) ──────────────────
  {
    slug: 'spinal-twist',
    severity: 'GRAVE',
    rinforzo: [
      'Il tentativo precedente era SBAGLIATO: GPT aveva disegnato',
      'una posizione yoga di equilibrio in piedi (eagle/tree pose),',
      'NON la torsione spinale supina richiesta.',
      '',
      'OBBLIGATORIO IN QUESTA RIGENERAZIONE:',
      '- La persona è SUPINA, distesa SUL PAVIMENTO. NON in piedi.',
      '- Vista dall\'alto (top-down) come da soffitto.',
      '- Braccia distese a croce ai lati a 90° dal busto, entrambe a terra.',
      '- Una gamba (es. destra) piegata col ginocchio portato verso il',
      '  lato OPPOSTO del corpo (sinistra), il ginocchio cade sul',
      '  pavimento a sinistra.',
      '- L\'altra gamba resta tesa a terra.',
      '- Sguardo verso la mano del lato opposto a quello in cui cade',
      '  il ginocchio (es. ginocchio cade a sinistra → sguardo a destra).',
    ].join('\n'),
  },
  {
    slug: 'shoulder-rolls',
    severity: 'GRAVE',
    rinforzo: [
      'Il tentativo precedente era SBAGLIATO: i due frame erano',
      'praticamente IDENTICI, non c\'era movimento visibile delle spalle.',
      '',
      'OBBLIGATORIO IN QUESTA RIGENERAZIONE:',
      '- Frame 1 (sinistra): spalle BASSE in posizione rilassata,',
      '  scapole giù lungo la schiena, collo lungo. Tutta la zona',
      '  spalle/scapole visibilmente in posizione di partenza neutra.',
      '- Frame 2 (destra): spalle MOLTO ALZATE, quasi alle orecchie,',
      '  e leggermente arretrate (come a stringere una matita tra le',
      '  scapole). La differenza con frame 1 deve essere INEQUIVOCABILE',
      '  a colpo d\'occhio: chiunque deve vedere che le spalle sono',
      '  in due posizioni diverse.',
    ].join('\n'),
  },
  {
    slug: 'skater-jumps',
    severity: 'GRAVE',
    rinforzo: [
      'Il tentativo precedente era SBAGLIATO: i due frame sembravano',
      'due corse normali, NON il salto laterale stile pattinaggio.',
      '',
      'OBBLIGATORIO IN QUESTA RIGENERAZIONE:',
      '- Frame 1 (sinistra): atterraggio sulla gamba DESTRA dopo un',
      '  salto laterale. La gamba destra è leggermente piegata e regge',
      '  tutto il peso. La gamba SINISTRA è INCROCIATA DIETRO la',
      '  gamba destra, col piede sinistro che si appoggia di lato',
      '  dietro al tallone destro per equilibrio. Il busto è',
      '  inclinato verso destra. Le braccia oscillano per equilibrio',
      '  (es. braccio sinistro avanti, destro dietro).',
      '- Frame 2 (destra): posizione speculare — atterraggio sulla',
      '  gamba SINISTRA con la destra incrociata dietro.',
      '- NIENTE postura da corsa frontale (busto eretto, ginocchia',
      '  alte alternate). Questo NON è high-knees, è skater jump.',
    ].join('\n'),
  },
  {
    slug: 'curl-isometrico-asciugamano',
    severity: 'GRAVE',
    rinforzo: [
      'Il tentativo precedente era SBAGLIATO: GPT aveva disegnato un',
      'uomo in piedi che teneva un asciugamano verticale a due mani',
      'davanti al corpo, come se lo stesse "stirando". Il curl',
      'isometrico col piede non era leggibile.',
      '',
      'OBBLIGATORIO IN QUESTA RIGENERAZIONE:',
      '- L\'asciugamano (rettangolo allungato in tono pesca/beige',
      '  #FFE0C8) PASSA SOTTO UN PIEDE della persona, visibilmente',
      '  a terra. Le due estremità dell\'asciugamano salgono ai lati',
      '  del piede.',
      '- Le mani afferrano le due estremità una per lato.',
      '- I gomiti sono PIEGATI A 90° vicini al busto, come per un',
      '  curl bicipite a metà strada.',
      '- Palmi rivolti verso l\'alto.',
      '- Posizione STATICA: l\'asciugamano è sotto tensione perché',
      '  il piede tira giù mentre le mani tirano su. Espressione di',
      '  sforzo/concentrazione.',
      '- Vista laterale per leggere chiaramente il piede sull\'asciugamano',
      '  e i gomiti a 90°.',
    ].join('\n'),
  },
  {
    slug: 'pull-apart-elastico',
    severity: 'GRAVE',
    rinforzo: [
      'Il tentativo precedente era SBAGLIATO: MANCAVA COMPLETAMENTE',
      'L\'ELASTICO. Le mani erano libere e si vedeva solo l\'apertura',
      'delle braccia.',
      '',
      'OBBLIGATORIO IN QUESTA RIGENERAZIONE:',
      '- L\'elastico DEVE essere visibile e disegnato come una linea',
      '  curva spessa color arancio (#FF7A1A) tesa tra le due mani',
      '  in ENTRAMBI i frame.',
      '- Frame 1 (sinistra): braccia tese in avanti all\'altezza delle',
      '  spalle, mani vicine, l\'elastico ha leggera tensione iniziale',
      '  (linea poco tesa).',
      '- Frame 2 (destra): braccia tese aperte ai lati a "T",',
      '  l\'elastico è disegnato STESO AL MASSIMO davanti al petto',
      '  come una linea curva tirata.',
      '- Senza l\'elastico l\'illustrazione è inutile — è il dettaglio',
      '  CHIAVE dell\'esercizio.',
    ].join('\n'),
  },
  {
    slug: 'y-t-w-prone',
    severity: 'GRAVE',
    rinforzo: [
      'Il tentativo precedente era SBAGLIATO: l\'ordine dei 3 frame',
      'sembrava W-T-W, la Y mancava o era confusa.',
      '',
      'OBBLIGATORIO IN QUESTA RIGENERAZIONE — definire',
      'ESPLICITAMENTE le 3 forme nell\'ordine corretto Y → T → W:',
      '',
      '- FRAME 1 (sinistra) — POSIZIONE "Y": persona prona con',
      '  fronte a terra, braccia tese in alto e aperte a 45° dal',
      '  busto formando una Y maiuscola visibile dall\'alto. Le mani',
      '  sono lontane dalla testa, in alto/avanti.',
      '',
      '- FRAME 2 (centro) — POSIZIONE "T": braccia tese aperte ai',
      '  lati a 90° dal busto (perpendicolari) formando una T',
      '  maiuscola. Le mani sono ai lati delle spalle.',
      '',
      '- FRAME 3 (destra) — POSIZIONE "W": gomiti piegati e tirati',
      '  vicino al busto, mani sollevate vicino alla testa ai lati,',
      '  formando una W maiuscola con i gomiti come "punte basse".',
      '',
      'Tutti e 3 i frame sono prone, vista dall\'alto. NIENTE lettere',
      'scritte nell\'immagine — solo le forme delle braccia.',
    ].join('\n'),
  },
  {
    slug: 'twist-seduti',
    severity: 'GRAVE',
    rinforzo: [
      'Il tentativo precedente era SBAGLIATO: la rotazione del busto',
      'tra i due frame era TROPPO SUBTLE, sembrava solo "donna seduta',
      'centrata" in entrambi.',
      '',
      'OBBLIGATORIO IN QUESTA RIGENERAZIONE:',
      '- Frame 1 (sinistra): seduta su sedia con busto CENTRATO',
      '  perfettamente, spalle parallele alla camera, mani giunte',
      '  davanti al petto, sguardo avanti.',
      '- Frame 2 (destra): seduta sulla stessa sedia, ma il busto è',
      '  CHIARAMENTE RUOTATO DI 60-70° VERSO UN LATO. Le spalle sono',
      '  visibilmente girate (una avanti, una dietro). Le mani giunte',
      '  sono portate ben FUORI dal centro, vicino al fianco di un lato.',
      '  Lo sguardo segue la rotazione. Bacino e gambe restano fermi.',
      '- La differenza tra i due frame DEVE essere a colpo d\'occhio',
      '  inequivocabile: "ha ruotato il busto".',
    ].join('\n'),
  },

  // ─── BORDERLINE (esercizio leggibile ma sub-ottimale) ──────────────
  {
    slug: 'mountain-climber',
    severity: 'BORDERLINE',
    rinforzo: [
      'Il tentativo precedente era SUB-OTTIMALE: i due frame erano',
      'troppo simili, l\'alternanza delle ginocchia era poco chiara.',
      '',
      'OBBLIGATORIO IN QUESTA RIGENERAZIONE:',
      '- Frame 1 (sinistra): plank alta vista laterale, ginocchio',
      '  DESTRO tirato MOLTO avanti vicino al petto, piede destro',
      '  vicino alla mano destra. Gamba sinistra ben TESA all\'indietro.',
      '- Frame 2 (destra): posizione SPECULARE — ginocchio SINISTRO',
      '  tirato avanti vicino al petto col piede sinistro vicino alla',
      '  mano sinistra. Gamba destra ben tesa all\'indietro.',
      '- La differenza tra i due frame deve essere DRAMMATICA: in',
      '  uno il ginocchio destro è avanti, nell\'altro il sinistro.',
    ].join('\n'),
  },
  {
    slug: 'hamstring-stretch',
    severity: 'BORDERLINE',
    rinforzo: [
      'Il tentativo precedente era SUB-OTTIMALE: GPT aveva disegnato',
      'una variante semplificata (forward fold base con entrambe le',
      'gambe quasi tese) invece della variante "figure-4 seated".',
      '',
      'OBBLIGATORIO IN QUESTA RIGENERAZIONE:',
      '- Persona SEDUTA a terra, vista laterale.',
      '- Una gamba (es. destra) TESA in avanti.',
      '- L\'ALTRA gamba (sinistra) PIEGATA col ginocchio in fuori e',
      '  la PIANTA DEL PIEDE sinistro APPOGGIATA contro l\'INTERNO',
      '  del ginocchio della gamba destra. La forma complessiva',
      '  delle gambe deve sembrare un "4" (figure-4 stretch).',
      '- Busto inclinato in avanti dall\'anca verso il piede destro,',
      '  mani che cercano la punta del piede destro.',
      '- Schiena LUNGA (non curva).',
    ].join('\n'),
  },
  {
    slug: 'diamond-push-up',
    severity: 'BORDERLINE',
    rinforzo: [
      'Il tentativo precedente era SUB-OTTIMALE: il rombo formato',
      'dalle mani non era evidente, sembrava solo un close-grip',
      'push-up senza il "diamond" caratteristico.',
      '',
      'OBBLIGATORIO IN QUESTA RIGENERAZIONE:',
      '- Vista a 3/4 dall\'alto-davanti per mostrare CHIARAMENTE le',
      '  mani a terra.',
      '- Le due mani sono ravvicinate sotto il petto: indici dx e sx',
      '  che si toccano, pollici dx e sx che si toccano. La forma',
      '  che si crea è un ROMBO/DIAMANTE NETTO e visibile.',
      '- Possibile (opzionale): leggera enfasi cromatica arancio',
      '  (#FF7A1A) sui contorni del rombo formato dai pollici/indici,',
      '  per evidenziare la forma chiave.',
      '- Frame 1: posizione alta (braccia tese) col rombo visibile.',
      '- Frame 2: posizione bassa (gomiti piegati lungo il busto,',
      '  petto sfiora il rombo).',
    ].join('\n'),
  },
  {
    slug: 'russian-twist',
    severity: 'BORDERLINE',
    rinforzo: [
      'Il tentativo precedente era SUB-OTTIMALE: la rotazione del',
      'busto tra i due frame era TROPPO SUBTLE.',
      '',
      'OBBLIGATORIO IN QUESTA RIGENERAZIONE:',
      '- Frame 1 (sinistra): seduta con ginocchia piegate, busto',
      '  inclinato indietro a 45°, busto CENTRATO, mani giunte',
      '  davanti al petto, spalle parallele alla camera.',
      '- Frame 2 (destra): stessa postura ma busto CHIARAMENTE',
      '  RUOTATO DI 60-70° verso un lato. Le spalle sono visibilmente',
      '  girate, le mani giunte portate ben FUORI dal centro, vicino',
      '  al fianco di un lato. Le gambe restano ferme nella posizione',
      '  iniziale.',
      '- La differenza tra i due frame deve essere INEQUIVOCABILE.',
    ].join('\n'),
  },
];

const BATCH_SIZE = 6;

function buildPromptWithRinforzo(entry, rinforzo) {
  const base = buildPrompt(entry);
  return [
    base,
    '',
    'RINFORZO CRITICO (rigenerazione — il primo tentativo è stato scartato):',
    rinforzo,
  ].join('\n');
}

function batchHeader(batchNum, totalBatches, entries) {
  const zipName = `fattrack-exercises-rifare-${String(batchNum).padStart(2, '0')}.zip`;
  const filenameList = entries.map((e) => `- ${e.slug}.png`).join('\n');
  return [
    `# RIFARE ${String(batchNum).padStart(2, '0')} / ${String(totalBatches).padStart(2, '0')} — rigenerazione esercizi scartati`,
    ``,
    `## Istruzioni per la chat GPT`,
    ``,
    `Questo è un batch di RIGENERAZIONE: ognuna delle ${entries.length} immagini elencate sotto è una NUOVA versione di un esercizio il cui primo tentativo era stato SCARTATO. Per ogni esercizio leggi il blocco "**RINFORZO CRITICO**" del prompt: spiega cosa era andato storto la volta precedente e cosa va fatto diversamente questa volta.`,
    ``,
    `Ogni prompt è auto-contenuto. Stile, palette e formato sono ripetuti come negli altri batch. Segui ESATTAMENTE il prompt di ciascuno.`,
    ``,
    `Al termine di tutte le ${entries.length} immagini, raggruppale in un singolo file ZIP chiamato \`${zipName}\` con i PNG nominati esattamente come indicato nel campo "**Nome file**" di ogni blocco. I nomi devono essere:`,
    ``,
    filenameList,
    ``,
    `Niente cartelle interne nello ZIP, file PNG flat alla radice.`,
    ``,
    `## Regole comuni`,
    ``,
    `- Formato PNG, dimensioni indicate nel singolo prompt.`,
    `- Sfondo bianco puro (#FFFFFF) o trasparente.`,
    `- Palette rigida: #FF7A1A / #D45C00 / #FFE0C8 / #1E2532 / #FFFFFF.`,
    `- NESSUN testo nelle immagini, NESSUNO sfondo scenografico, NESSUNA freccia/etichetta/numero.`,
    `- Stile vettoriale flat moderno coerente con i batch precedenti.`,
    ``,
    `---`,
    ``,
  ].join('\n');
}

function batchFooter(batchNum, entries) {
  const zipName = `fattrack-exercises-rifare-${String(batchNum).padStart(2, '0')}.zip`;
  return [
    ``,
    `---`,
    ``,
    `## Output finale`,
    ``,
    `Quando hai completato le ${entries.length} immagini, raggruppale in \`${zipName}\` coi nomi file esatti indicati. Conferma a fine generazione che ogni filename corrisponde correttamente prima di creare lo ZIP.`,
    ``,
  ].join('\n');
}

function entryBlock(index, entry, rinforzo) {
  const heading = `## ${index}. ${entry.name}`;
  const sevBadge = `(${rinforzo.severity})`;
  const fileLine = `**Nome file**: \`${entry.slug}.png\` ${sevBadge}`;
  const prompt = buildPromptWithRinforzo(entry, rinforzo.rinforzo);
  return [
    heading,
    ``,
    fileLine,
    ``,
    '```text',
    prompt,
    '```',
    ``,
    `---`,
    ``,
  ].join('\n');
}

function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Match each rifare entry to manifest
  const entries = RIFARE.map((r) => {
    const m = MANIFEST.find((x) => x.slug === r.slug);
    if (!m) throw new Error(`Manifest entry mancante per slug: ${r.slug}`);
    return { manifest: m, rifare: r };
  });

  const totalBatches = Math.ceil(entries.length / BATCH_SIZE);
  console.log(`Da rifare: ${entries.length} esercizi → ${totalBatches} batch da max ${BATCH_SIZE}\n`);

  for (let i = 0; i < totalBatches; i += 1) {
    const start = i * BATCH_SIZE;
    const slice = entries.slice(start, start + BATCH_SIZE);
    const batchNum = i + 1;
    const fileName = `rifare-${String(batchNum).padStart(2, '0')}.md`;
    const filePath = path.join(OUTPUT_DIR, fileName);

    const sliceManifest = slice.map((s) => s.manifest);
    const parts = [batchHeader(batchNum, totalBatches, sliceManifest)];
    slice.forEach((s, idx) => {
      parts.push(entryBlock(idx + 1, s.manifest, s.rifare));
    });
    parts.push(batchFooter(batchNum, sliceManifest));

    fs.writeFileSync(filePath, parts.join(''));
    console.log(`${fileName}: ${slice.length} esercizi → ${slice.map((s) => s.manifest.slug).join(', ')}`);
  }
}

main();

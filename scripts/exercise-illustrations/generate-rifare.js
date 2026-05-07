#!/usr/bin/env node
// Genera i file batch di rifacimento per gli esercizi presenti nella
// lista da-rifare.md. Ogni prompt viene costruito a partire dal manifest
// originale (con eventuali override) + un blocco "RINFORZO CRITICO" che
// evidenzia il difetto del primo tentativo.
//
// Uso:
//   node scripts/exercise-illustrations/generate-rifare.js
//
// Output: scripts/exercise-illustrations/batches/rifare-NN.md
//
// Nota: la lista RIFARE qui è la lista CORRENTE da rigenerare. Ad ogni
// round (round 1 = primi 11, round 2 = ostinati, ecc.) si aggiorna la
// lista togliendo gli esercizi promossi. I file rifare-NN.md vecchi NON
// vanno conservati: esistono solo come "next prompt da usare". Lo
// storico vive in da-rifare.md.

const fs = require('fs');
const path = require('path');

const { MANIFEST } = require('./manifest');
const { buildPrompt } = require('./template');

// I batch md vivono in assets/exercises/newbatch/ (vedi commento in
// generate-batches.js). Anche i rifare-NN.md finiscono lì.
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'assets', 'exercises', 'newbatch');

// ROUND 3 — i 3 ostinati che hanno fallito anche nel round 2.
// Per questi cambiamo la vista (lateral invece di top-down per
// spinal-twist e y-t-w-prone) e/o sostituiamo del tutto le frames del
// manifest con descrizioni più chirurgiche, perché GPT ha pattern
// resistenti su queste posizioni.
const RIFARE = [
  {
    slug: 'spinal-twist',
    severity: 'GRAVE — round 3',
    override: {
      view: 'lateral',
      frames: [
        'Donna distesa SUPINA SUL PAVIMENTO (a pancia in su, schiena interamente appoggiata a terra), vista laterale di profilo. Le braccia sono aperte ai lati a "T" appoggiate a terra. Una gamba (la sinistra) è piegata col ginocchio portato in alto e poi verso il LATO OPPOSTO del corpo: il ginocchio sinistro è caduto/appoggiato sul pavimento DAL LATO DESTRO (passando sopra la gamba destra). L\'altra gamba (la destra) è tesa a terra in posizione neutra. La testa è girata verso il lato OPPOSTO al ginocchio caduto (sguardo a sinistra). TUTTO IL CORPO è SDRAIATO ORIZZONTALE sul pavimento — NON in piedi, NON in equilibrio.',
      ],
    },
    rinforzo: [
      'TENTATIVO PRECEDENTE: GPT ha disegnato di nuovo una posizione',
      'YOGA IN PIEDI con la gamba sollevata in equilibrio (eagle/tree',
      'pose), nonostante avessimo specificato "supina vista dall\'alto".',
      'SBAGLIATO ANCORA.',
      '',
      'CAMBIO DI STRATEGIA — questa volta usiamo VISTA LATERALE per',
      'rendere geometricamente IMPOSSIBILE confondere con una posa in',
      'piedi:',
      '- La persona è ORIZZONTALE sul pavimento, vista da lato.',
      '- I piedi NON sono a terra in posizione verticale (in piedi),',
      '  sono uno teso orizzontale e uno appoggiato sul pavimento dal',
      '  lato opposto del corpo dopo la torsione.',
      '- Si vede chiaramente lo SPAZIO TRA IL CORPO E IL PAVIMENTO',
      '  appiattito a zero (il busto è premuto contro il pavimento).',
      '- Questa è "supine spinal twist" / "torsione spinale supina"',
      '  / "reclined spinal twist" — NON un twist in piedi, NON un',
      '  pretzel pose, NON un eagle pose.',
      '- Se hai dubbi: cerca mentalmente "supine spinal twist yoga',
      '  pose" come riferimento prima di disegnare.',
    ].join('\n'),
  },
  {
    slug: 'curl-isometrico-asciugamano',
    severity: 'GRAVE — round 3',
    override: {
      view: 'frontal',
      frames: [
        'Vista FRONTALE ravvicinata di un uomo in piedi su un asciugamano. L\'asciugamano (rettangolo ALLUNGATO orizzontale color pesca/beige #FFE0C8) è disteso A TERRA SOTTO IL PIEDE SINISTRO (visibile sotto la scarpa). Le DUE estremità dell\'asciugamano salgono dai due lati del piede e arrivano fino alle mani all\'altezza del torace. La mano destra afferra l\'estremità destra, la mano sinistra afferra l\'estremità sinistra. ENTRAMBI i gomiti sono PIEGATI A 90° vicino al busto (come un curl bicipite a metà). I palmi sono rivolti VERSO L\'ALTO (presa supina). L\'altra gamba (destra) è in posizione neutra accanto, piede a terra. Posizione STATICA — espressione di sforzo/tensione perché il piede tira giù mentre i bicipiti tirano su contro la resistenza dell\'asciugamano.',
      ],
    },
    rinforzo: [
      'TENTATIVO PRECEDENTE: GPT ha disegnato un uomo in piedi che',
      'tiene un asciugamano verticale come una corda davanti al corpo,',
      'con le braccia dritte verso il basso. SBAGLIATO. Non c\'era il',
      'piede sull\'asciugamano e i gomiti non erano a 90°.',
      '',
      'OBBLIGATORIO QUESTA VOLTA — disegnare come fosse un diagramma',
      'didattico chiaro:',
      '1. Inquadratura: vista FRONTALE ravvicinata (vediamo il torso',
      '   intero e i piedi a terra).',
      '2. ELEMENTO 1 — IL PIEDE SULL\'ASCIUGAMANO: l\'asciugamano è',
      '   un rettangolo allungato a terra in tono pesca (#FFE0C8).',
      '   La SCARPA SINISTRA è sopra la parte centrale dell\'asciugamano',
      '   (lo schiaccia a terra). L\'asciugamano si estende ai due',
      '   lati del piede, fuoriuscendo da sinistra e da destra.',
      '3. ELEMENTO 2 — LE MANI CHE TIRANO: le due estremità',
      '   dell\'asciugamano salgono verticalmente dai due lati del',
      '   piede, e arrivano alle due mani che le afferrano all\'altezza',
      '   del torace. I gomiti sono piegati a 90°, vicini al busto,',
      '   palmi verso l\'alto (curl).',
      '4. ELEMENTO 3 — TENSIONE: l\'asciugamano è teso al massimo,',
      '   come un cavo di trazione. La persona ha un\'espressione di',
      '   tensione/sforzo controllato.',
      '',
      'Se non riesci a immaginarlo: pensa a una "boat shape" con',
      'l\'asciugamano dove i due lati salgono dal piede alle mani.',
    ].join('\n'),
  },
  {
    slug: 'y-t-w-prone',
    severity: 'GRAVE — round 3',
    override: {
      strategy: 'triple',
      view: 'lateral',
      frames: [
        'Vista LATERALE DI PROFILO di una persona PRONA SUL PAVIMENTO (a pancia in giù, fronte appoggiata a terra). Tutto il corpo è ORIZZONTALE, premuto contro il pavimento. Le braccia sono tese in alto/avanti aperte a 45° dal busto (formando una Y vista dall\'alto). Le braccia sono LEGGERMENTE SOLLEVATE dal pavimento (~10-15 cm) per attivare i muscoli posteriori delle spalle.',
        'Stessa persona prona vista di profilo, posizione speculare ma con braccia tese aperte ai LATI a 90° dal busto (formando una T). Braccia ancora leggermente sollevate dal pavimento. Corpo ancora completamente disteso a terra a pancia in giù.',
        'Stessa persona prona vista di profilo, ora con GOMITI PIEGATI vicino al busto e MANI sollevate ai lati della testa (formando una W con l\'avambraccio). Corpo ancora completamente prono sul pavimento.',
      ],
    },
    rinforzo: [
      'TENTATIVO PRECEDENTE: GPT ha disegnato un uomo IN PIEDI VISTO',
      'DA DIETRO (con scarpe in basso, schiena visibile) con le braccia',
      'in 3 posizioni Y/T/W. SBAGLIATO. Le posizioni delle braccia',
      'erano corrette ma la persona NON era prona.',
      '',
      'CAMBIO DI VISTA — passiamo da top-down a LATERALE per evitare',
      'l\'ambiguità "vista da dietro in piedi" vs "vista dall\'alto prono":',
      '',
      '- Tutti e 3 i frame mostrano la persona DI PROFILO sdraiata',
      '  ORIZZONTALMENTE sul pavimento, a PANCIA IN GIÙ (prone).',
      '- La fronte è appoggiata a terra in posizione neutra.',
      '- Le gambe sono distese a terra estese all\'indietro.',
      '- Il corpo NON è verticale, NON è in piedi, NON è in vista',
      '  posteriore. È ORIZZONTALE, con la pancia premuta contro',
      '  il pavimento.',
      '- La differenza tra i 3 frame è SOLO la posizione delle',
      '  braccia (Y → T → W), che si vedono di profilo dal lato.',
      '- Si vede chiaramente che le braccia sono LEGGERMENTE',
      '  SOLLEVATE dal pavimento (non a terra appoggiate, non in alto',
      '  in piedi).',
      '',
      'Riferimento mentale: pensa a "Superman exercise" → posizione',
      'corpo identica, ma con braccia in 3 forme diverse Y/T/W invece',
      'di tese in avanti.',
    ].join('\n'),
  },
];

const BATCH_SIZE = 6;

function buildPromptWithRinforzo(entry, rifareCfg) {
  // Applica override (se presente) prima di costruire il prompt base.
  const merged = { ...entry, ...(rifareCfg.override || {}) };
  const base = buildPrompt(merged);
  return [
    base,
    '',
    'RINFORZO CRITICO (rigenerazione — il primo tentativo è stato scartato):',
    rifareCfg.rinforzo,
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
    `Questo è un batch di RIGENERAZIONE: ognuna delle ${entries.length} immagini elencate sotto è una NUOVA versione di un esercizio il cui tentativo precedente era stato SCARTATO. Per ogni esercizio leggi il blocco "**RINFORZO CRITICO**" del prompt: spiega cosa era andato storto la volta precedente e cosa va fatto diversamente questa volta.`,
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

function entryBlock(index, entry, rifareCfg) {
  const heading = `## ${index}. ${entry.name}`;
  const sevBadge = `(${rifareCfg.severity})`;
  const fileLine = `**Nome file**: \`${entry.slug}.png\` ${sevBadge}`;
  const prompt = buildPromptWithRinforzo(entry, rifareCfg);
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

  // Cancella eventuali rifare-*.md vecchi prima di rigenerare
  const existing = fs.readdirSync(OUTPUT_DIR).filter((f) => f.startsWith('rifare-'));
  existing.forEach((f) => fs.unlinkSync(path.join(OUTPUT_DIR, f)));
  if (existing.length > 0) {
    console.log(`Rimossi ${existing.length} file rifare-* preesistenti.\n`);
  }

  // Match each rifare entry to manifest
  const entries = RIFARE.map((r) => {
    const m = MANIFEST.find((x) => x.slug === r.slug);
    if (!m) throw new Error(`Manifest entry mancante per slug: ${r.slug}`);
    return { manifest: m, rifare: r };
  });

  if (entries.length === 0) {
    console.log('Nessun esercizio da rifare. Niente da generare.');
    return;
  }

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

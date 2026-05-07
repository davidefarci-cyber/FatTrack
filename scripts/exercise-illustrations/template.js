// Template per la generazione del prompt singolo a partire da una entry
// del manifest. Restituisce una stringa auto-contenuta da incollare nel
// batch markdown.

const CHARACTER_BLOCKS = {
  M: 'Uomo stilizzato atletico, capelli scuri corti, viso semplice e pulito, maglietta arancio (#FF7A1A) aderente, pantaloncini neri (#1E2532), scarpe da ginnastica nere con dettagli arancio.',
  F: 'Donna stilizzata atletica, capelli scuri raccolti in coda alta, viso semplice e pulito, top sportivo arancio (#FF7A1A), leggings neri (#1E2532) lunghi al ginocchio o sotto, scarpe da ginnastica nere con dettagli arancio.',
};

const VIEW_DESCRIPTIONS = {
  lateral: 'Vista laterale (di profilo), così l\'allineamento del corpo è leggibile. Tutti i frame sullo stesso lato di profilo.',
  frontal: 'Vista frontale (di fronte alla camera), per mostrare chiaramente larghezza/apertura/simmetria del movimento.',
  'three-quarter': 'Vista a 3/4 (tra frontale e laterale), per leggere sia profondità che rotazione/apertura.',
  'top-down': 'Vista dall\'alto (top-down), per leggere chiaramente la disposizione di braccia e gambe sul pavimento.',
};

const STRATEGY_DESCRIPTIONS = {
  single: 'Singolo frame con il personaggio nella posizione descritta.',
  dual: 'Due frame affiancati orizzontalmente che mostrano la progressione del movimento (sinistra → destra).',
  triple: 'Tre frame affiancati orizzontalmente che mostrano la sequenza del movimento (sinistra → centro → destra).',
};

const FORMAT_DESCRIPTIONS = {
  single: '1024 x 1024 px (quadrato 1:1)',
  dual: '1600 x 1200 px (landscape 4:3) — entrambe le figure visibili senza essere schiacciate',
  triple: '1920 x 1080 px (landscape 16:9) — tutte e tre le figure visibili senza essere schiacciate',
};

function framesBlock(frames, strategy) {
  if (strategy === 'single') {
    return `FRAME UNICO:\n${frames[0]}`;
  }
  if (strategy === 'dual') {
    return [
      'DUE FRAME (affiancati orizzontalmente, stessa baseline orizzontale per i due personaggi):',
      '',
      `FRAME 1 (sinistra) — ${frames[0]}`,
      '',
      `FRAME 2 (destra) — ${frames[1]}`,
    ].join('\n');
  }
  if (strategy === 'triple') {
    return [
      'TRE FRAME (affiancati orizzontalmente, stessa baseline orizzontale per i tre personaggi):',
      '',
      `FRAME 1 (sinistra) — ${frames[0]}`,
      '',
      `FRAME 2 (centro) — ${frames[1]}`,
      '',
      `FRAME 3 (destra) — ${frames[2]}`,
    ].join('\n');
  }
  throw new Error(`Strategia sconosciuta: ${strategy}`);
}

function coherenceBlock(strategy) {
  if (strategy === 'single') return '';
  return [
    '',
    'COERENZA PERSONAGGIO (CRITICO): tutti i frame mostrano la STESSA',
    'PERSONA — stesse proporzioni, stesso identico outfit, stessa',
    'pettinatura, stesso colore di pelle e capelli. I frame NON devono',
    'sembrare persone diverse.',
  ].join('\n');
}

function buildPrompt(entry, options = {}) {
  const { compact = false } = options;
  const view = VIEW_DESCRIPTIONS[entry.view];
  if (!view) throw new Error(`View sconosciuta: ${entry.view} per ${entry.slug}`);
  const strategyDesc = STRATEGY_DESCRIPTIONS[entry.strategy];
  if (!strategyDesc) throw new Error(`Strategy sconosciuta: ${entry.strategy} per ${entry.slug}`);
  const charBlock = CHARACTER_BLOCKS[entry.character];
  if (!charBlock) throw new Error(`Character sconosciuto: ${entry.character} per ${entry.slug}`);
  const formatDesc = FORMAT_DESCRIPTIONS[entry.strategy];

  if (compact) {
    return buildCompactPrompt(entry, view, strategyDesc, charBlock, formatDesc);
  }
  return buildFullPrompt(entry, view, strategyDesc, charBlock, formatDesc);
}

// Modalità COMPACT: per Custom GPT che ha già le specifiche stile nelle
// Instructions. Il GPT sa già:
// - cosa significano single/dual/triple e i loro formati
// - cosa significano lateral/frontal/three-quarter/top-down
// - lo spec character per M/F
// - che dual/triple vogliono stessa persona, stessa baseline
// - palette, vincoli no-text, sfondo, composizione
// Quindi qui mettiamo SOLO i dati specifici dell'esercizio. Output ~6-8
// righe invece di ~40.
function buildCompactPrompt(entry, view, strategyDesc, charBlock, formatDesc) {
  const lines = [
    `ESERCIZIO: ${entry.name}`,
    `STRATEGIA: ${entry.strategy}`,
    `VISTA: ${entry.view}`,
    `PERSONAGGIO: ${entry.character}`,
    ``,
    framesBlockCompact(entry.frames, entry.strategy),
  ];

  if (entry.notes && entry.notes.trim().length > 0) {
    lines.push(``, `NOTE: ${entry.notes}`);
  }

  return lines.join('\n');
}

// Frames in modalità compact: solo le descrizioni con label minimal,
// niente header "DUE FRAME affiancati orizzontalmente..." perché
// implicito nella STRATEGIA dual/triple che il GPT conosce.
function framesBlockCompact(frames, strategy) {
  if (strategy === 'single') {
    return `FRAME: ${frames[0]}`;
  }
  if (strategy === 'dual') {
    return [
      `FRAME 1: ${frames[0]}`,
      ``,
      `FRAME 2: ${frames[1]}`,
    ].join('\n');
  }
  if (strategy === 'triple') {
    return [
      `FRAME 1: ${frames[0]}`,
      ``,
      `FRAME 2: ${frames[1]}`,
      ``,
      `FRAME 3: ${frames[2]}`,
    ].join('\n');
  }
  throw new Error(`Strategia sconosciuta: ${strategy}`);
}

// Modalità FULL: prompt auto-contenuto, con tutto lo stile ripetuto in
// ogni blocco. Per ChatGPT generico (non Custom GPT) o quando si vuole
// massima robustezza contro deriva di sessione.
function buildFullPrompt(entry, view, strategyDesc, charBlock, formatDesc) {
  const lines = [
    `Crea un'illustrazione di un esercizio fitness coerente con il design system di un'app mobile.`,
    ``,
    `ESERCIZIO: ${entry.name}`,
    `STRATEGIA: ${strategyDesc}`,
    ``,
    framesBlock(entry.frames, entry.strategy),
    ``,
    `VISTA: ${view}`,
    ``,
    `PERSONAGGIO (${entry.character === 'M' ? 'uomo' : 'donna'}):`,
    charBlock,
    coherenceBlock(entry.strategy),
    ``,
    `STILE VISIVO:`,
    `- Illustrazione vettoriale flat moderna, linee medie con`,
    `  terminazioni arrotondate, riempimenti selettivi.`,
    `- Coerente con il look di app come Apple Fitness / Nike Training`,
    `  Club, ma più semplice e leggibile.`,
    `- Niente sfondo scenografico, niente texture decorative.`,
    ``,
    `PALETTE (RIGIDA — usa SOLO questi colori):`,
    `- #FF7A1A arancio caldo (abbigliamento, dettagli)`,
    `- #D45C00 arancio scuro (ombre/contorni)`,
    `- #FFE0C8 pesca (pelle, eventuali oggetti tessili chiari)`,
    `- #1E2532 quasi-nero (linee, capelli, pantaloni, oggetti scuri)`,
    `- #FFFFFF bianco (sfondo)`,
    `NESSUN ALTRO COLORE. Niente blu, verdi, rossi, viola, gialli.`,
    ``,
    `COMPOSIZIONE:`,
    `- Formato ${formatDesc}.`,
    `- Sfondo bianco puro (o trasparente).`,
    `- Soggetto centrato sia orizzontalmente sia verticalmente.`,
    `- Margine esterno ~10-15% di spazio bianco.`,
    `- Ammessa solo un'ombra ellittica sottile sotto i punti d'appoggio`,
    `  (#1E2532 a bassa opacità). Niente linee del pavimento.`,
    ``,
    `OBBLIGATORIO — NESSUN TESTO NELL'IMMAGINE: niente titolo, niente`,
    `didascalie, niente etichette, niente numeri di frame, niente`,
    `frecce, niente cerchi informativi. SOLO la figura (o le figure)`,
    `che esegue il movimento.`,
  ];

  if (entry.notes && entry.notes.trim().length > 0) {
    lines.push(``, `NOTE SPECIFICHE: ${entry.notes}`);
  }

  return lines.join('\n');
}

module.exports = { buildPrompt };

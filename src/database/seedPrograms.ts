import type * as SQLite from 'expo-sqlite';

import type { EquipmentTag } from '../types/equipment';
import { serializeEquipmentTags } from '../types/equipment';
import type {
  WorkoutCategory,
  WorkoutGoal,
  WorkoutLevel,
} from './workoutsDB';

// Seed dei "programmi" preset (multi-day). Ogni programma è composto da
// N workout preset (`is_preset=1`) legati da righe `program_workouts`.
// Idempotente: se esiste almeno un programma `is_preset=1` non rifaccio
// nulla. I workout di un programma sono comunque navigabili nella libreria
// schede come tutti gli altri preset.
//
// Le `equipment_tags` di ciascun esercizio della libreria hanno semantica
// "OR" (uno qualsiasi di questi tag basta per eseguire l'esercizio); il
// `required_equipment` del workout invece ha semantica "AND" (l'utente
// deve avere TUTTI i tag elencati). Per evitare ambiguità, qui
// `requiredEquipment` è dichiarato a mano per ogni workout dall'autore
// del preset, NON derivato automaticamente.

type SeedProgramExercise = {
  exerciseName: string;
  alternativeName?: string;
  sets: number | null;
  reps: number | null;
  repsMax: number | null;
  durationSec: number | null;
  durationMaxSec: number | null;
  restSec: number | null;
  notes: string | null;
};

type SeedProgramWorkout = {
  name: string;
  category: WorkoutCategory;
  level: WorkoutLevel;
  estimatedDurationMin: number;
  notes: string | null;
  requiredEquipment: EquipmentTag[];
  dayLabel: string;
  exercises: SeedProgramExercise[];
};

type SeedProgram = {
  name: string;
  goal: WorkoutGoal;
  level: WorkoutLevel;
  daysPerWeek: number;
  notes: string;
  workouts: SeedProgramWorkout[];
};

// Helper compatti per non far esplodere i record degli esercizi.
const reps = (
  sets: number,
  min: number,
  max: number | null = null,
  restSec: number | null = null,
  notes: string | null = null,
  alternativeName?: string,
): SeedProgramExercise => ({
  exerciseName: '', // riempito dal chiamante
  alternativeName,
  sets,
  reps: min,
  repsMax: max,
  durationSec: null,
  durationMaxSec: null,
  restSec,
  notes,
});

const dur = (
  sets: number,
  min: number,
  max: number | null = null,
  restSec: number | null = null,
  notes: string | null = null,
  alternativeName?: string,
): SeedProgramExercise => ({
  exerciseName: '',
  alternativeName,
  sets,
  reps: null,
  repsMax: null,
  durationSec: min,
  durationMaxSec: max,
  restSec,
  notes,
});

function ex(
  exerciseName: string,
  base: SeedProgramExercise,
): SeedProgramExercise {
  return { ...base, exerciseName };
}

const PROGRAM_NOTE = (lines: string[]): string => lines.join('\n');

// ─── Programma 1 — Dimagrimento Full Body 3 giorni ─────────────────
const PROG_DIMAGRIMENTO: SeedProgram = {
  name: 'Dimagrimento Full Body 3 Giorni',
  goal: 'dimagrimento',
  level: 'principiante',
  daysPerWeek: 3,
  notes: PROGRAM_NOTE([
    'Programma 3×settimana mirato a dimagrimento e mantenimento muscolare.',
    'Ruota Giorno A → B → C con almeno 1 giorno di recupero tra le sedute.',
    'Aumenta i carichi gradualmente quando le ripetizioni diventano facili.',
    'Esecuzione controllata, non puntare alla velocità.',
    'Se la seduta è troppo lunga riduci prima braccia/addome, non gambe/schiena/petto.',
  ]),
  workouts: [
    {
      name: 'Dimagrimento Full Body — Giorno A',
      category: 'misto',
      level: 'principiante',
      estimatedDurationMin: 55,
      notes: 'Forza base. Cardio iniziale + lavoro full body con manubri.',
      requiredEquipment: ['manubri', 'panca'],
      dayLabel: 'Giorno A',
      exercises: [
        ex('Camminata veloce', dur(1, 1200, 1800, 60, 'Velocità 5–6 km/h')),
        ex('Squat con manubri', reps(3, 10, 12, 60)),
        ex('Panca piana con manubri', reps(3, 8, 12, 60, null, 'Push-up')),
        ex('Rematore con manubrio', reps(3, 10, 12, 60, 'Per lato')),
        ex('Curl bicipiti con manubri', reps(3, 10, 12, 45)),
        ex('Estensioni tricipiti con manubrio', reps(3, 10, 12, 45)),
        ex('Plank', dur(3, 30, 60, 45)),
        ex('Crunch', reps(3, 20, null, 45)),
      ],
    },
    {
      name: 'Dimagrimento Full Body — Giorno B',
      category: 'misto',
      level: 'principiante',
      estimatedDurationMin: 50,
      notes: 'Metabolico. Lavoro più rapido con focus su catena posteriore e core.',
      requiredEquipment: ['manubri', 'panca_inclinata'],
      dayLabel: 'Giorno B',
      exercises: [
        ex('Camminata veloce', dur(1, 900, 1200, 60, 'Velocità 5–6 km/h')),
        ex('Affondi con manubri', reps(3, 10, null, 60, 'Per gamba')),
        ex('Panca inclinata con manubri', reps(3, 8, 12, 60, null, 'Push-up')),
        ex('Stacco rumeno con manubri', reps(3, 10, 12, 60)),
        ex('Alzate laterali con manubri', reps(3, 12, 15, 45)),
        ex('Curl bicipiti con manubri', reps(2, 12, null, 45)),
        ex('Mountain climber', dur(3, 30, 45, 45)),
        ex('Bicycle crunch', reps(3, 20, 30, 45)),
      ],
    },
    {
      name: 'Dimagrimento Full Body — Giorno C',
      category: 'misto',
      level: 'principiante',
      estimatedDurationMin: 60,
      notes: 'Resistenza + tono. Cardio più lungo e full body con focus spalle.',
      requiredEquipment: ['manubri', 'panca', 'sedia_o_panca'],
      dayLabel: 'Giorno C',
      exercises: [
        ex('Camminata veloce', dur(1, 1500, 2100, 60, 'Velocità 5–6 km/h')),
        ex('Step-up con manubri', reps(3, 10, null, 60, 'Per gamba')),
        ex('Panca piana con manubri', reps(3, 8, 12, 60)),
        ex('Rematore con manubrio', reps(3, 10, 12, 60, 'Per lato')),
        ex('Shoulder press con manubri', reps(3, 10, 12, 60)),
        ex(
          'Estensioni tricipiti con manubrio',
          reps(2, 12, null, 45, null, 'Curl bicipiti con manubri'),
        ),
        ex('Leg raise', reps(3, 10, 15, 45)),
        ex('Crunch', reps(3, 20, null, 45)),
      ],
    },
  ],
};

// ─── Programma 2 — Resistenza ──────────────────────────────────────
const PROG_RESISTENZA: SeedProgram = {
  name: 'Resistenza 3 Giorni',
  goal: 'resistenza',
  level: 'principiante',
  daysPerWeek: 3,
  notes: PROGRAM_NOTE([
    'Programma 3×settimana per migliorare resistenza muscolare e cardio.',
    'Tempi più lunghi, recuperi brevi, intensità moderata.',
    'Il giorno 3 introduce manubri leggeri opzionali per le braccia.',
    'Almeno 1 giorno di recupero tra le sedute.',
  ]),
  workouts: [
    {
      name: 'Resistenza — Giorno 1',
      category: 'misto',
      level: 'principiante',
      estimatedDurationMin: 35,
      notes: 'Circuito metabolico a corpo libero. Recuperi brevi.',
      requiredEquipment: [],
      dayLabel: 'Giorno 1',
      exercises: [
        ex('Jumping jacks', dur(3, 45, null, 30)),
        ex('Squat', reps(3, 15, null, 30)),
        ex('Push-up', reps(3, 10, 12, 30)),
        ex('Mountain climber', dur(3, 40, null, 30)),
        ex('Plank', dur(3, 40, null, 30)),
        ex('Burpees', reps(2, 8, 10, 60)),
      ],
    },
    {
      name: 'Resistenza — Giorno 2',
      category: 'misto',
      level: 'principiante',
      estimatedDurationMin: 40,
      notes: 'Cardio + core. Camminata o cyclette come base aerobica.',
      requiredEquipment: [],
      dayLabel: 'Giorno 2',
      exercises: [
        ex('Camminata veloce', dur(1, 1500, null, 60, null, 'Cyclette')),
        ex('Affondi', reps(3, 12, null, 45, 'Per gamba')),
        ex('Russian twist', reps(3, 20, null, 30)),
        ex('Skater jumps', dur(3, 30, null, 30)),
        ex('Bird-dog', reps(3, 10, null, 30, 'Per lato')),
        ex('Side plank', dur(3, 30, null, 30, 'Per lato')),
      ],
    },
    {
      name: 'Resistenza — Giorno 3',
      category: 'misto',
      level: 'principiante',
      estimatedDurationMin: 45,
      notes: 'Full body resistenza con manubri leggeri opzionali.',
      requiredEquipment: ['manubri'],
      dayLabel: 'Giorno 3',
      exercises: [
        ex('Camminata veloce', dur(1, 900, null, 60, 'Riscaldamento')),
        ex('Goblet squat con manubri', reps(3, 15, null, 45)),
        ex(
          'Push-up',
          reps(3, 10, 12, 45, null, 'Panca piana con manubri'),
        ),
        ex('Curl bicipiti con manubri', reps(3, 15, null, 30)),
        ex('Shoulder press con manubri', reps(3, 12, null, 45)),
        ex('Bicycle crunch', reps(3, 30, null, 30)),
      ],
    },
  ],
};

// ─── Programma 3 — Mantenimento ───────────────────────────────────
const PROG_MANTENIMENTO: SeedProgram = {
  name: 'Mantenimento 3 Giorni',
  goal: 'mantenimento',
  level: 'intermedio',
  daysPerWeek: 3,
  notes: PROGRAM_NOTE([
    'Programma 3×settimana per mantenere forza e composizione.',
    'Split upper/lower/full body con cardio leggero il terzo giorno.',
    'Carichi moderati-pesanti, recuperi 60-75s sui multiarticolari.',
    'Almeno 1 giorno di recupero tra le sedute.',
  ]),
  workouts: [
    {
      name: 'Mantenimento — Giorno 1',
      category: 'forza',
      level: 'intermedio',
      estimatedDurationMin: 50,
      notes: 'Upper body. Spinte + tirate + isolamento braccia.',
      requiredEquipment: ['manubri', 'panca'],
      dayLabel: 'Giorno 1',
      exercises: [
        ex('Panca piana con manubri', reps(4, 8, 10, 75)),
        ex('Rematore con manubrio', reps(4, 10, null, 60, 'Per lato')),
        ex('Shoulder press con manubri', reps(3, 10, 12, 60)),
        ex('Curl bicipiti con manubri', reps(3, 12, null, 45)),
        ex('Estensioni tricipiti con manubrio', reps(3, 12, null, 45)),
        ex('Plank', dur(3, 45, null, 30)),
      ],
    },
    {
      name: 'Mantenimento — Giorno 2',
      category: 'forza',
      level: 'intermedio',
      estimatedDurationMin: 50,
      notes: 'Lower body. Quadricipiti, glutei, femorali, core.',
      requiredEquipment: ['manubri', 'sedia_o_panca'],
      dayLabel: 'Giorno 2',
      exercises: [
        ex('Squat con manubri', reps(4, 10, null, 75)),
        ex('Affondi con manubri', reps(3, 12, null, 60, 'Per gamba')),
        ex('Stacco rumeno con manubri', reps(3, 10, 12, 60)),
        ex('Step-up con manubri', reps(3, 10, null, 45, 'Per gamba')),
        ex('Glute bridge', reps(3, 15, null, 30)),
        ex('Leg raise', reps(3, 12, 15, 30)),
      ],
    },
    {
      name: 'Mantenimento — Giorno 3',
      category: 'misto',
      level: 'intermedio',
      estimatedDurationMin: 45,
      notes: 'Full body con cardio leggero iniziale e core stability.',
      requiredEquipment: ['manubri'],
      dayLabel: 'Giorno 3',
      exercises: [
        ex('Camminata veloce', dur(1, 900, null, 60)),
        ex('Goblet squat con manubri', reps(3, 12, null, 60)),
        ex('Push-up', reps(3, 10, 12, 45)),
        ex('Bird-dog', reps(3, 10, null, 30, 'Per lato')),
        ex('Dead bug', reps(3, 10, null, 30, 'Per lato')),
        ex('Crunch', reps(3, 20, null, 30)),
      ],
    },
  ],
};

// ─── Programma 4 — Mobilità ──────────────────────────────────────
const PROG_MOBILITA: SeedProgram = {
  name: 'Mobilità 3 Giorni',
  goal: 'mobilita',
  level: 'principiante',
  daysPerWeek: 3,
  notes: PROGRAM_NOTE([
    'Programma 3×settimana per migliorare mobilità articolare e ridurre tensioni.',
    'Tutto a corpo libero, durate brevi, niente carichi.',
    'Esegui ogni movimento lentamente, respirando in modo regolare.',
    'Si può alternare ai programmi di forza nei giorni di recupero attivo.',
  ]),
  workouts: [
    {
      name: 'Mobilità — Giorno 1',
      category: 'mobilita',
      level: 'principiante',
      estimatedDurationMin: 22,
      notes: 'Schiena & core. Mobilizzazione colonna + attivazione stabilizzatori.',
      requiredEquipment: [],
      dayLabel: 'Giorno 1',
      exercises: [
        ex('Schiena - Cat-cow', dur(2, 60, null, 15)),
        ex('Schiena - Cobra', dur(2, 30, null, 15)),
        ex('Schiena - Child pose', dur(2, 60, null, 15)),
        ex('Spinal twist', dur(2, 45, null, 15, 'Per lato')),
        ex('Superman', reps(2, 12, null, 20)),
        ex('Bird-dog', reps(2, 10, null, 20, 'Per lato')),
      ],
    },
    {
      name: 'Mobilità — Giorno 2',
      category: 'mobilita',
      level: 'principiante',
      estimatedDurationMin: 22,
      notes: 'Anche & gambe. Apertura coxofemorale + catena posteriore.',
      requiredEquipment: [],
      dayLabel: 'Giorno 2',
      exercises: [
        ex('Anche - Hip circles', dur(2, 45, null, 15)),
        ex('Anche - Leg swings', reps(2, 12, null, 15, 'Per lato')),
        ex('Anche - Pigeon pose', dur(2, 45, null, 15, 'Per lato')),
        ex('Full body - Downward dog', dur(2, 45, null, 20)),
        ex('Lateral lunge', reps(2, 10, null, 30, 'Per lato')),
        ex('Glute bridge', reps(2, 15, null, 20)),
      ],
    },
    {
      name: 'Mobilità — Giorno 3',
      category: 'mobilita',
      level: 'principiante',
      estimatedDurationMin: 22,
      notes: 'Full body opening. Spalle, petto, posteriori, stabilità.',
      requiredEquipment: [],
      dayLabel: 'Giorno 3',
      exercises: [
        ex('Spalle - Shoulder rolls', dur(2, 45, null, 15)),
        ex('Chest opener', dur(2, 45, null, 15)),
        ex('Full body - Downward dog', dur(2, 45, null, 20)),
        ex('Hamstring stretch', dur(2, 45, null, 15, 'Per lato')),
        ex('Quad stretch', dur(2, 45, null, 15, 'Per lato')),
        ex('Plank', dur(2, 30, null, 20)),
      ],
    },
  ],
};

// ─── Programma 5 — Calistenico Principianti 3 giorni ─────────────
// Split Push / Pull / Legs+Core a corpo libero. Equipment minimo:
// corpo libero + sbarra (per la giornata Pull). Le regressioni sono
// fornite come `alternativeName` (push-up sui ginocchi/inclinati al
// posto di push-up; australian pull-up al posto delle trazioni;
// pistol assistito o box pistol al posto del pistol completo).
// Progressioni indicate nelle note di ogni esercizio.
const PROG_CALISTENICO: SeedProgram = {
  name: 'Calistenico Principianti 3 Giorni',
  goal: 'mantenimento',
  level: 'principiante',
  daysPerWeek: 3,
  notes: PROGRAM_NOTE([
    'Programma 3×settimana a corpo libero su split Push / Pull / Legs+Core.',
    'Equipment necessario: una sbarra per trazioni (Giorno B). Elastico opzionale come assistenza.',
    'Ruota Push → Pull → Legs+Core con almeno 1 giorno di recupero tra le sedute.',
    'Ogni esercizio ha una regressione (alternativa più facile) e una progressione (in note): inizia dal livello più adatto.',
    'Esecuzione lenta e controllata: la qualità del movimento batte sempre il numero di ripetizioni.',
    'Quando arrivi al limite alto delle reps con tecnica pulita, passa alla progressione indicata.',
  ]),
  workouts: [
    {
      name: 'Calistenico — Giorno A (Push)',
      category: 'forza',
      level: 'principiante',
      estimatedDurationMin: 40,
      notes: 'Spinta verticale e orizzontale. Petto, spalle, tricipiti.',
      requiredEquipment: [],
      dayLabel: 'Giorno A — Push',
      exercises: [
        ex(
          'Jumping jacks',
          dur(2, 45, 60, 30, 'Riscaldamento generale'),
        ),
        ex(
          'Spalle - Shoulder rolls',
          dur(1, 30, 45, 20, 'Mobilità spalle pre-spinta'),
        ),
        ex(
          'Push-up',
          reps(
            3,
            6,
            12,
            75,
            'Progressione: passa a Diamond push-up o Push-up declinati quando arrivi a 12 reps pulite.',
            'Push-up sui ginocchi',
          ),
        ),
        ex(
          'Pike push-up',
          reps(
            3,
            5,
            10,
            75,
            'Progressione verso il push-up in verticale. Regressione: alza il bacino meno.',
            'Push-up inclinati',
          ),
        ),
        ex(
          'Tricep dip',
          reps(
            3,
            6,
            12,
            60,
            'Progressione: gambe distese in avanti per più carico.',
          ),
        ),
        ex(
          'Plank to push-up',
          reps(2, 6, 10, 45, 'Per lato. Alterna braccio guida.'),
        ),
        ex(
          'Plank',
          dur(3, 30, 60, 45, 'Aumenta il tempo prima di passare a Hollow hold.'),
        ),
      ],
    },
    {
      name: 'Calistenico — Giorno B (Pull)',
      category: 'forza',
      level: 'principiante',
      estimatedDurationMin: 40,
      notes: 'Tirata verticale e orizzontale alla sbarra. Dorsali, bicipiti, scapole.',
      requiredEquipment: ['sbarra'],
      dayLabel: 'Giorno B — Pull',
      exercises: [
        ex(
          'Jumping jacks',
          dur(2, 45, 60, 30, 'Riscaldamento generale'),
        ),
        ex(
          'Spalle - Shoulder rolls',
          dur(1, 30, 45, 20, 'Mobilità spalle pre-tirata'),
        ),
        ex(
          'Dead hang',
          dur(
            3,
            15,
            45,
            60,
            'Costruisci la presa fino a 45s prima di passare alle trazioni complete.',
          ),
        ),
        ex(
          'Scapular pull',
          reps(
            3,
            6,
            12,
            45,
            'Attivazione scapolare: prerequisito alle trazioni.',
          ),
        ),
        ex(
          'Australian pull-up',
          reps(
            3,
            6,
            12,
            75,
            'Progressione: avvicina i piedi alla sbarra (corpo più orizzontale).',
            'Trazioni assistite con elastico',
          ),
        ),
        ex(
          'Negativa di trazione',
          reps(
            3,
            3,
            6,
            90,
            'Scendi 3-5 secondi resistendo. Progressione naturale verso le trazioni complete.',
            'Trazioni assistite con elastico',
          ),
        ),
        ex(
          'Reverse snow angel',
          reps(
            2,
            10,
            15,
            45,
            'Lavoro di trapezio medio e dorsali alti.',
          ),
        ),
        ex(
          'Superman',
          reps(2, 10, 15, 45, 'Catena posteriore lombare.'),
        ),
      ],
    },
    {
      name: 'Calistenico — Giorno C (Legs + Core)',
      category: 'forza',
      level: 'principiante',
      estimatedDurationMin: 45,
      notes: 'Gambe monopodaliche, glutei e core completo.',
      requiredEquipment: [],
      dayLabel: 'Giorno C — Legs + Core',
      exercises: [
        ex(
          'Anche - Leg swings',
          reps(2, 10, 15, 20, 'Per lato. Mobilità anche.'),
        ),
        ex(
          'Anche - Hip circles',
          dur(1, 30, 45, 20, 'Riscaldamento dell’articolazione coxofemorale.'),
        ),
        ex(
          'Squat',
          reps(
            3,
            12,
            20,
            60,
            'Progressione: passa a Sumo squat o Cossack squat per varianti più impegnative.',
          ),
        ),
        ex(
          'Bulgarian split squat',
          reps(
            3,
            6,
            10,
            60,
            'Per gamba. Progressione: aggiungi una pausa di 2s in basso.',
            'Affondi',
          ),
        ),
        ex(
          'Box pistol squat',
          reps(
            3,
            5,
            8,
            75,
            'Per gamba. Progressione: abbassa l’altezza della sedia, poi passa a Pistol squat assistito.',
            'Bulgarian split squat',
          ),
        ),
        ex(
          'Glute bridge a una gamba',
          reps(
            3,
            8,
            12,
            45,
            'Per gamba. Progressione: appoggia la schiena su una panca per più ROM (hip thrust).',
            'Glute bridge',
          ),
        ),
        ex(
          'Hollow hold',
          dur(
            3,
            20,
            45,
            45,
            'Lombari schiacciate a terra: il vero indicatore della tecnica.',
          ),
        ),
        ex(
          'Side plank',
          dur(2, 20, 45, 30, 'Per lato. Obliqui e stabilità del bacino.'),
        ),
        ex(
          'Leg raise',
          reps(
            3,
            10,
            15,
            45,
            'Progressione naturale verso Knee raise appeso e poi Leg raise appeso.',
          ),
        ),
      ],
    },
  ],
};

const SEED_PROGRAMS: SeedProgram[] = [
  PROG_DIMAGRIMENTO,
  PROG_RESISTENZA,
  PROG_MANTENIMENTO,
  PROG_MOBILITA,
  PROG_CALISTENICO,
];

export async function seedProgramsIfEmpty(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM workout_programs WHERE is_preset = 1',
  );
  if (row && row.count > 0) return;

  // Risolve nome → id degli esercizi (preset workout dipendono da `exercises`).
  const exerciseRows = await db.getAllAsync<{ id: number; name: string }>(
    'SELECT id, name FROM exercises',
  );
  const idByName = new Map<string, number>();
  for (const r of exerciseRows) idByName.set(r.name, r.id);

  for (const program of SEED_PROGRAMS) {
    const workoutIds: number[] = [];

    for (const w of program.workouts) {
      const wRes = await db.runAsync(
        `INSERT INTO workouts
           (name, category, goal, level, required_equipment, is_preset,
            notes, estimated_duration_min)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        w.name,
        w.category,
        program.goal,
        w.level,
        serializeEquipmentTags(w.requiredEquipment),
        w.notes,
        w.estimatedDurationMin,
      );
      const workoutId = wRes.lastInsertRowId as number;

      for (let i = 0; i < w.exercises.length; i++) {
        const e = w.exercises[i];
        const mainId = idByName.get(e.exerciseName);
        if (!mainId) {
          throw new Error(
            `seedPrograms: esercizio principale "${e.exerciseName}" mancante in libreria.`,
          );
        }
        let altId: number | null = null;
        if (e.alternativeName) {
          const found = idByName.get(e.alternativeName);
          if (!found) {
            throw new Error(
              `seedPrograms: esercizio alternativo "${e.alternativeName}" mancante in libreria.`,
            );
          }
          altId = found;
        }
        await db.runAsync(
          `INSERT INTO workout_exercises
             (workout_id, exercise_id, position, sets, reps, reps_max,
              duration_sec, duration_max_sec, rest_sec, weight_kg,
              alternative_exercise_id, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
          workoutId,
          mainId,
          i,
          e.sets,
          e.reps,
          e.repsMax,
          e.durationSec,
          e.durationMaxSec,
          e.restSec,
          altId,
          e.notes,
        );
      }
      workoutIds.push(workoutId);
    }

    const pRes = await db.runAsync(
      `INSERT INTO workout_programs
         (name, goal, level, days_per_week, is_preset, notes)
       VALUES (?, ?, ?, ?, 1, ?)`,
      program.name,
      program.goal,
      program.level,
      program.daysPerWeek,
      program.notes,
    );
    const programId = pRes.lastInsertRowId as number;

    for (let i = 0; i < workoutIds.length; i++) {
      await db.runAsync(
        `INSERT INTO program_workouts
           (program_id, workout_id, position, day_label)
         VALUES (?, ?, ?, ?)`,
        programId,
        workoutIds[i],
        i,
        program.workouts[i].dayLabel,
      );
    }
  }
}

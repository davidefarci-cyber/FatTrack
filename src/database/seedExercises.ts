import type * as SQLite from 'expo-sqlite';

import type { ExerciseLevel } from './exercisesDB';

// Seed minimo della libreria esercizi: copre i 3 preset di Fase 2.
// La libreria completa (~40 esercizi con filtri/search) arriva in Fase 4
// (vedi PLAN.md §4A). Pattern allineato a `seedFoodsIfEmpty`: lavora solo
// su tabella vuota (`count === 0`) — niente UPSERT su nome.

type SeedExercise = {
  name: string;
  muscleGroup: string;
  equipment: string;
  level: ExerciseLevel;
  description: string;
  guideSteps: string[];
  videoUrl: string | null;
  met: number | null;
};

export const SEED_EXERCISES: SeedExercise[] = [
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
  {
    name: 'Affondi',
    muscleGroup: 'Gambe',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 5,
    description: 'Affondi alternati per quadricipiti, glutei e equilibrio.',
    guideSteps: [
      'In piedi, fai un passo avanti con una gamba.',
      'Piega entrambe le ginocchia formando due angoli di 90°.',
      'Il ginocchio posteriore sfiora il pavimento senza appoggiarsi.',
      'Spingi sul tallone anteriore per tornare in piedi e cambia gamba.',
    ],
    videoUrl: null,
  },
  {
    name: 'Push-up',
    muscleGroup: 'Petto',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 4,
    description: 'Piegamenti sulle braccia per petto, spalle e tricipiti.',
    guideSteps: [
      'Mani a terra alla larghezza delle spalle, corpo allineato.',
      'Piega i gomiti scendendo fino a sfiorare il pavimento col petto.',
      'Mantieni il core attivo: niente bacino abbassato o sollevato.',
      'Spingi per tornare alla posizione di partenza con braccia tese.',
    ],
    videoUrl: null,
  },
  {
    name: 'Plank',
    muscleGroup: 'Core',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 3,
    description: 'Tenuta isometrica per addominali, lombari e stabilità.',
    guideSteps: [
      'Avambracci a terra, gomiti sotto le spalle.',
      'Corpo dritto dalla testa ai talloni, glutei contratti.',
      'Sguardo rivolto al pavimento, collo allineato alla schiena.',
      'Mantieni la posizione respirando regolarmente.',
    ],
    videoUrl: null,
  },
  {
    name: 'Crunch',
    muscleGroup: 'Core',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 3.5,
    description: 'Esercizio classico per il retto addominale.',
    guideSteps: [
      'Disteso a terra, ginocchia piegate e piedi appoggiati.',
      'Mani dietro la testa, gomiti aperti.',
      'Solleva spalle e parte alta della schiena contraendo gli addominali.',
      'Scendi lentamente senza far cadere la testa di colpo.',
    ],
    videoUrl: null,
  },
  {
    name: 'Burpees',
    muscleGroup: 'Full body',
    equipment: 'Corpo libero',
    level: 'intermedio',
    met: 8,
    description: 'Esercizio total body ad alta intensità per cardio e forza.',
    guideSteps: [
      'In piedi, scendi in squat e poggia le mani a terra.',
      'Salta indietro con i piedi finendo in posizione plank.',
      'Esegui un push-up (opzionale) e riporta i piedi alle mani.',
      'Salta verticalmente con le braccia distese sopra la testa.',
    ],
    videoUrl: null,
  },
  {
    name: 'Mountain climber',
    muscleGroup: 'Cardio',
    equipment: 'Corpo libero',
    level: 'intermedio',
    met: 7,
    description: 'Cardio dinamico in plank per core e gambe.',
    guideSteps: [
      'Posizione di plank alta con braccia tese.',
      'Porta un ginocchio verso il petto mantenendo il core attivo.',
      'Cambia gamba rapidamente come se stessi correndo.',
      'Mantieni il bacino basso e i glutei in linea con la schiena.',
    ],
    videoUrl: null,
  },
  {
    name: 'Glute bridge',
    muscleGroup: 'Glutei',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 3,
    description: 'Ponte glutei per attivare la catena posteriore.',
    guideSteps: [
      'Disteso supino, ginocchia piegate e piedi vicini ai glutei.',
      'Spingi con i talloni e solleva il bacino verso l’alto.',
      'Contrai i glutei in cima e mantieni 1–2 secondi.',
      'Scendi controllato senza appoggiare del tutto il bacino.',
    ],
    videoUrl: null,
  },
  {
    name: 'Bird-dog',
    muscleGroup: 'Core',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 2.5,
    description: 'Esercizio di stabilizzazione per core e lombari.',
    guideSteps: [
      'In quadrupedia, mani sotto le spalle e ginocchia sotto i fianchi.',
      'Estendi un braccio in avanti e la gamba opposta indietro.',
      'Mantieni il bacino stabile, niente rotazioni del busto.',
      'Torna lentamente al centro e alterna lato.',
    ],
    videoUrl: null,
  },
  {
    name: 'Cat-cow',
    muscleGroup: 'Mobilità',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 2,
    description: 'Mobilità per la colonna vertebrale, ottima al risveglio.',
    guideSteps: [
      'In quadrupedia, mani sotto le spalle, ginocchia sotto i fianchi.',
      '"Cow": inarca la schiena guardando in alto, addome verso terra.',
      '"Cat": arrotonda la schiena verso l’alto, mento verso il petto.',
      'Alterna i due movimenti seguendo il respiro.',
    ],
    videoUrl: null,
  },
];

export async function seedExercisesIfEmpty(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM exercises',
  );
  if (row && row.count > 0) return;

  for (const ex of SEED_EXERCISES) {
    await db.runAsync(
      `INSERT INTO exercises
        (name, muscle_group, equipment, level, description, guide_steps, video_url, met)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ex.name,
      ex.muscleGroup,
      ex.equipment,
      ex.level,
      ex.description,
      JSON.stringify(ex.guideSteps),
      ex.videoUrl,
      ex.met,
    );
  }
}

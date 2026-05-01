import type * as SQLite from 'expo-sqlite';

import type { WorkoutCategory } from './workoutsDB';

// Seed dei 3 preset di Fase 2. Idempotente: lavora solo se nessuna scheda
// `is_preset=1` esiste ancora. Gli esercizi referenziati sono cercati per
// nome contro la libreria seedata da `seedExercisesIfEmpty` (eseguito
// prima da `getDatabase()`); se un nome manca, la scheda salta quella riga
// senza fallire.

type SeedWorkoutExercise = {
  exerciseName: string;
  sets: number | null;
  reps: number | null;
  durationSec: number | null;
  restSec: number | null;
  notes: string | null;
};

type SeedWorkout = {
  name: string;
  category: WorkoutCategory;
  notes: string;
  estimatedDurationMin: number;
  exercises: SeedWorkoutExercise[];
};

const PRESET_NOTES = 'Preset di sistema. Duplicalo per modificarlo.';

export const SEED_PRESET_WORKOUTS: SeedWorkout[] = [
  {
    name: 'Full Body Casa',
    category: 'forza',
    notes: PRESET_NOTES,
    estimatedDurationMin: 30,
    exercises: [
      { exerciseName: 'Squat', sets: 3, reps: 12, durationSec: null, restSec: 60, notes: null },
      { exerciseName: 'Push-up', sets: 3, reps: 10, durationSec: null, restSec: 60, notes: null },
      {
        exerciseName: 'Affondi',
        sets: 3,
        reps: 10,
        durationSec: null,
        restSec: 60,
        notes: 'Per gamba',
      },
      { exerciseName: 'Plank', sets: 3, reps: null, durationSec: 30, restSec: 45, notes: null },
    ],
  },
  {
    name: 'Push Pull Legs — Day 1 (Push)',
    category: 'forza',
    notes: PRESET_NOTES,
    estimatedDurationMin: 35,
    exercises: [
      { exerciseName: 'Push-up', sets: 4, reps: 12, durationSec: null, restSec: 75, notes: null },
      { exerciseName: 'Plank', sets: 3, reps: null, durationSec: 40, restSec: 45, notes: null },
      { exerciseName: 'Crunch', sets: 3, reps: 15, durationSec: null, restSec: 45, notes: null },
      {
        exerciseName: 'Mountain climber',
        sets: 3,
        reps: null,
        durationSec: 30,
        restSec: 60,
        notes: null,
      },
      { exerciseName: 'Burpees', sets: 2, reps: 8, durationSec: null, restSec: 90, notes: null },
    ],
  },
  {
    name: 'Mobilità mattina',
    category: 'mobilita',
    notes: PRESET_NOTES,
    estimatedDurationMin: 15,
    exercises: [
      { exerciseName: 'Cat-cow', sets: 2, reps: null, durationSec: 60, restSec: 15, notes: null },
      {
        exerciseName: 'Bird-dog',
        sets: 2,
        reps: 10,
        durationSec: null,
        restSec: 20,
        notes: 'Per lato',
      },
      {
        exerciseName: 'Glute bridge',
        sets: 2,
        reps: 12,
        durationSec: null,
        restSec: 30,
        notes: null,
      },
      { exerciseName: 'Plank', sets: 2, reps: null, durationSec: 20, restSec: 20, notes: null },
    ],
  },
];

export async function seedPresetWorkoutsIfEmpty(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM workouts WHERE is_preset = 1',
  );
  if (row && row.count > 0) return;

  // Lookup id per nome dalla libreria esercizi seedata in precedenza.
  const exerciseRows = await db.getAllAsync<{ id: number; name: string }>(
    'SELECT id, name FROM exercises',
  );
  const idByName = new Map<string, number>();
  for (const e of exerciseRows) idByName.set(e.name.toLowerCase(), e.id);

  for (const preset of SEED_PRESET_WORKOUTS) {
    const result = await db.runAsync(
      `INSERT INTO workouts
        (name, category, is_preset, notes, estimated_duration_min)
       VALUES (?, ?, 1, ?, ?)`,
      preset.name,
      preset.category,
      preset.notes,
      preset.estimatedDurationMin,
    );
    const workoutId = result.lastInsertRowId as number;

    let position = 0;
    for (const ex of preset.exercises) {
      const exerciseId = idByName.get(ex.exerciseName.toLowerCase());
      if (exerciseId === undefined) continue; // libreria mancante: skip silenzioso.
      await db.runAsync(
        `INSERT INTO workout_exercises
          (workout_id, exercise_id, position, sets, reps, duration_sec, rest_sec, weight_kg, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
        workoutId,
        exerciseId,
        position,
        ex.sets,
        ex.reps,
        ex.durationSec,
        ex.restSec,
        ex.notes,
      );
      position += 1;
    }
  }
}

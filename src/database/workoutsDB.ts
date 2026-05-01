import { getDatabase } from './db';

// CRUD completo per le schede allenamento. Una `Workout` è la scheda
// (header) + lista ordinata di `WorkoutExercise` (figli). I preset
// (`is_preset=1`) sono read-only ma duplicabili. Le mutazioni
// (create/update) sono in transazione: l'aggiornamento delle righe
// figlie usa DELETE + INSERT (più semplice e deterministico della diff
// manuale, con N piccolo per scheda).

export type WorkoutCategory = 'forza' | 'cardio' | 'mobilita' | 'misto';

export type WorkoutExercise = {
  id: number;
  workoutId: number;
  exerciseId: number;
  position: number;
  sets: number | null;
  reps: number | null;
  durationSec: number | null;
  restSec: number | null;
  weightKg: number | null;
  notes: string | null;
};

export type Workout = {
  id: number;
  name: string;
  category: WorkoutCategory;
  isPreset: boolean;
  notes: string | null;
  estimatedDurationMin: number | null;
  createdAt: string;
  updatedAt: string;
  exercises: WorkoutExercise[];
};

export type NewWorkout = Omit<
  Workout,
  'id' | 'createdAt' | 'updatedAt' | 'isPreset' | 'exercises'
> & {
  exercises: Array<Omit<WorkoutExercise, 'id' | 'workoutId'>>;
};

type WorkoutRow = {
  id: number;
  name: string;
  category: WorkoutCategory;
  isPreset: number;
  notes: string | null;
  estimatedDurationMin: number | null;
  createdAt: string;
  updatedAt: string;
};

type WorkoutExerciseRow = {
  id: number;
  workoutId: number;
  exerciseId: number;
  position: number;
  sets: number | null;
  reps: number | null;
  durationSec: number | null;
  restSec: number | null;
  weightKg: number | null;
  notes: string | null;
};

const WORKOUT_COLUMNS = `
  id,
  name,
  category,
  is_preset AS isPreset,
  notes,
  estimated_duration_min AS estimatedDurationMin,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

const EXERCISE_COLUMNS = `
  id,
  workout_id AS workoutId,
  exercise_id AS exerciseId,
  position,
  sets,
  reps,
  duration_sec AS durationSec,
  rest_sec AS restSec,
  weight_kg AS weightKg,
  notes
`;

function rowToWorkout(row: WorkoutRow, exercises: WorkoutExercise[]): Workout {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    isPreset: row.isPreset === 1,
    notes: row.notes,
    estimatedDurationMin: row.estimatedDurationMin,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    exercises,
  };
}

function rowToExercise(row: WorkoutExerciseRow): WorkoutExercise {
  return {
    id: row.id,
    workoutId: row.workoutId,
    exerciseId: row.exerciseId,
    position: row.position,
    sets: row.sets,
    reps: row.reps,
    durationSec: row.durationSec,
    restSec: row.restSec,
    weightKg: row.weightKg,
    notes: row.notes,
  };
}

async function loadExercises(workoutId: number): Promise<WorkoutExercise[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<WorkoutExerciseRow>(
    `SELECT ${EXERCISE_COLUMNS} FROM workout_exercises
     WHERE workout_id = ? ORDER BY position ASC`,
    workoutId,
  );
  return rows.map(rowToExercise);
}

export async function getAllWorkouts(): Promise<Workout[]> {
  const db = await getDatabase();
  // Preset prima, poi user workout per `updated_at DESC` (più recenti in cima).
  const rows = await db.getAllAsync<WorkoutRow>(
    `SELECT ${WORKOUT_COLUMNS} FROM workouts
     ORDER BY is_preset DESC, updated_at DESC`,
  );
  const result: Workout[] = [];
  for (const row of rows) {
    const exercises = await loadExercises(row.id);
    result.push(rowToWorkout(row, exercises));
  }
  return result;
}

export async function getWorkoutById(id: number): Promise<Workout | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<WorkoutRow>(
    `SELECT ${WORKOUT_COLUMNS} FROM workouts WHERE id = ?`,
    id,
  );
  if (!row) return null;
  const exercises = await loadExercises(row.id);
  return rowToWorkout(row, exercises);
}

async function insertExercises(
  db: Awaited<ReturnType<typeof getDatabase>>,
  workoutId: number,
  exercises: NewWorkout['exercises'],
): Promise<void> {
  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    await db.runAsync(
      `INSERT INTO workout_exercises
        (workout_id, exercise_id, position, sets, reps, duration_sec, rest_sec, weight_kg, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      workoutId,
      ex.exerciseId,
      i,
      ex.sets,
      ex.reps,
      ex.durationSec,
      ex.restSec,
      ex.weightKg,
      ex.notes,
    );
  }
}

export async function createWorkout(input: NewWorkout): Promise<Workout> {
  const db = await getDatabase();
  let workoutId: number | null = null;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO workouts (name, category, is_preset, notes, estimated_duration_min)
       VALUES (?, ?, 0, ?, ?)`,
      input.name,
      input.category,
      input.notes,
      input.estimatedDurationMin,
    );
    workoutId = result.lastInsertRowId as number;
    await insertExercises(db, workoutId, input.exercises);
  });
  if (workoutId === null) throw new Error('Workout creation failed');
  const created = await getWorkoutById(workoutId);
  if (!created) throw new Error('Workout creation failed');
  return created;
}

export async function updateWorkout(
  id: number,
  patch: NewWorkout,
): Promise<Workout> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE workouts
        SET name = ?, category = ?, notes = ?, estimated_duration_min = ?,
            updated_at = datetime('now')
       WHERE id = ?`,
      patch.name,
      patch.category,
      patch.notes,
      patch.estimatedDurationMin,
      id,
    );
    await db.runAsync(
      `DELETE FROM workout_exercises WHERE workout_id = ?`,
      id,
    );
    await insertExercises(db, id, patch.exercises);
  });
  const updated = await getWorkoutById(id);
  if (!updated) throw new Error('Workout update failed');
  return updated;
}

export async function deleteWorkout(id: number): Promise<void> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ isPreset: number }>(
    `SELECT is_preset AS isPreset FROM workouts WHERE id = ?`,
    id,
  );
  if (!row) return;
  if (row.isPreset === 1) {
    throw new Error('I preset non possono essere eliminati');
  }
  // workout_exercises cascade dalla FK ON DELETE CASCADE.
  await db.runAsync(`DELETE FROM workouts WHERE id = ?`, id);
}

export async function duplicateWorkout(
  id: number,
  newName?: string,
): Promise<Workout> {
  const source = await getWorkoutById(id);
  if (!source) throw new Error('Workout non trovato');
  const finalName = newName?.trim() || `${source.name} (copia)`;
  return createWorkout({
    name: finalName,
    category: source.category,
    notes: source.notes,
    estimatedDurationMin: source.estimatedDurationMin,
    exercises: source.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      position: ex.position,
      sets: ex.sets,
      reps: ex.reps,
      durationSec: ex.durationSec,
      restSec: ex.restSec,
      weightKg: ex.weightKg,
      notes: ex.notes,
    })),
  });
}

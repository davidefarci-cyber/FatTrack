import { getDatabase } from './db';
import type { WorkoutGoal, WorkoutLevel } from './workoutsDB';

// CRUD per i "programmi" (multi-day): un `Program` aggrega N `Workout`
// esistenti con un ordine ("Giorno A → B → C"). Stesse convenzioni di
// `workoutsDB`: preset (`is_preset=1`) read-only ma duplicabili,
// mutazioni in transazione, righe figlie via DELETE + INSERT.
//
// Stato "programma attivo": singleton `active_program` (analogo a
// `active_session` / `app_settings`). La logica "prossima sessione"
// vive qui (`getNextProgramWorkout`): incrementa di 1 rispetto a
// `lastCompletedProgramWorkoutId`, ciclando alla fine.

export type ProgramWorkout = {
  id: number;
  programId: number;
  workoutId: number;
  position: number;
  dayLabel: string | null;
};

export type Program = {
  id: number;
  name: string;
  goal: WorkoutGoal | null;
  level: WorkoutLevel | null;
  daysPerWeek: number;
  isPreset: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  workouts: ProgramWorkout[];
};

export type NewProgram = Omit<
  Program,
  'id' | 'createdAt' | 'updatedAt' | 'isPreset' | 'workouts'
> & {
  workouts: Array<Omit<ProgramWorkout, 'id' | 'programId'>>;
};

export type ActiveProgram = {
  programId: number;
  lastCompletedProgramWorkoutId: number | null;
  startedAt: string;
  updatedAt: string;
};

type ProgramRow = {
  id: number;
  name: string;
  goal: WorkoutGoal | null;
  level: WorkoutLevel | null;
  daysPerWeek: number;
  isPreset: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProgramWorkoutRow = {
  id: number;
  programId: number;
  workoutId: number;
  position: number;
  dayLabel: string | null;
};

const PROGRAM_COLUMNS = `
  id,
  name,
  goal,
  level,
  days_per_week AS daysPerWeek,
  is_preset AS isPreset,
  notes,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

const PROGRAM_WORKOUT_COLUMNS = `
  id,
  program_id AS programId,
  workout_id AS workoutId,
  position,
  day_label AS dayLabel
`;

function rowToProgram(row: ProgramRow, workouts: ProgramWorkout[]): Program {
  return {
    id: row.id,
    name: row.name,
    goal: row.goal,
    level: row.level,
    daysPerWeek: row.daysPerWeek,
    isPreset: row.isPreset === 1,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    workouts,
  };
}

async function loadProgramWorkouts(programId: number): Promise<ProgramWorkout[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ProgramWorkoutRow>(
    `SELECT ${PROGRAM_WORKOUT_COLUMNS} FROM program_workouts
     WHERE program_id = ? ORDER BY position ASC`,
    programId,
  );
  return rows;
}

export async function getAllPrograms(): Promise<Program[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ProgramRow>(
    `SELECT ${PROGRAM_COLUMNS} FROM workout_programs
     ORDER BY is_preset DESC, updated_at DESC`,
  );
  const result: Program[] = [];
  for (const row of rows) {
    const workouts = await loadProgramWorkouts(row.id);
    result.push(rowToProgram(row, workouts));
  }
  return result;
}

export async function getProgramById(id: number): Promise<Program | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ProgramRow>(
    `SELECT ${PROGRAM_COLUMNS} FROM workout_programs WHERE id = ?`,
    id,
  );
  if (!row) return null;
  const workouts = await loadProgramWorkouts(row.id);
  return rowToProgram(row, workouts);
}

async function insertProgramWorkouts(
  db: Awaited<ReturnType<typeof getDatabase>>,
  programId: number,
  workouts: NewProgram['workouts'],
): Promise<void> {
  // Riassegna `position` in modo contiguo (0..N-1) ignorando il valore
  // passato in input: rispetta l'ordine dell'array, evita buchi e collisioni
  // con UNIQUE(program_id, position).
  for (let i = 0; i < workouts.length; i++) {
    const w = workouts[i];
    await db.runAsync(
      `INSERT INTO program_workouts
        (program_id, workout_id, position, day_label)
       VALUES (?, ?, ?, ?)`,
      programId,
      w.workoutId,
      i,
      w.dayLabel,
    );
  }
}

export async function createProgram(input: NewProgram): Promise<Program> {
  const db = await getDatabase();
  let programId: number | null = null;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO workout_programs
         (name, goal, level, days_per_week, is_preset, notes)
       VALUES (?, ?, ?, ?, 0, ?)`,
      input.name,
      input.goal,
      input.level,
      input.daysPerWeek,
      input.notes,
    );
    programId = result.lastInsertRowId as number;
    await insertProgramWorkouts(db, programId, input.workouts);
  });
  if (programId === null) throw new Error('Program creation failed');
  const created = await getProgramById(programId);
  if (!created) throw new Error('Program creation failed');
  return created;
}

export async function updateProgram(
  id: number,
  patch: NewProgram,
): Promise<Program> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE workout_programs
        SET name = ?, goal = ?, level = ?, days_per_week = ?, notes = ?,
            updated_at = datetime('now')
       WHERE id = ?`,
      patch.name,
      patch.goal,
      patch.level,
      patch.daysPerWeek,
      patch.notes,
      id,
    );
    await db.runAsync(
      `DELETE FROM program_workouts WHERE program_id = ?`,
      id,
    );
    await insertProgramWorkouts(db, id, patch.workouts);
  });
  const updated = await getProgramById(id);
  if (!updated) throw new Error('Program update failed');
  return updated;
}

export async function deleteProgram(id: number): Promise<void> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ isPreset: number }>(
    `SELECT is_preset AS isPreset FROM workout_programs WHERE id = ?`,
    id,
  );
  if (!row) return;
  if (row.isPreset === 1) {
    throw new Error('I preset non possono essere eliminati');
  }
  // program_workouts cascade dalla FK ON DELETE CASCADE.
  // Anche `active_program.program_id` ha CASCADE: se è il programma attivo,
  // viene azzerato il singleton.
  await db.runAsync(`DELETE FROM workout_programs WHERE id = ?`, id);
}

// ───────── Programma attivo (singleton) ─────────

type ActiveProgramRow = {
  programId: number;
  lastCompletedProgramWorkoutId: number | null;
  startedAt: string;
  updatedAt: string;
};

const ACTIVE_COLUMNS = `
  program_id AS programId,
  last_completed_program_workout_id AS lastCompletedProgramWorkoutId,
  started_at AS startedAt,
  updated_at AS updatedAt
`;

export async function getActiveProgram(): Promise<ActiveProgram | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ActiveProgramRow>(
    `SELECT ${ACTIVE_COLUMNS} FROM active_program WHERE id = 1`,
  );
  return row ?? null;
}

export async function setActiveProgram(programId: number): Promise<ActiveProgram> {
  const db = await getDatabase();
  // Sostituisce il singolo record (id=1). Se l'utente cambia programma
  // azzeriamo anche `lastCompletedProgramWorkoutId` per ripartire dal
  // Giorno 1.
  await db.runAsync(
    `INSERT INTO active_program
       (id, program_id, last_completed_program_workout_id, started_at, updated_at)
     VALUES (1, ?, NULL, datetime('now'), datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       program_id = excluded.program_id,
       last_completed_program_workout_id = NULL,
       started_at = excluded.started_at,
       updated_at = excluded.updated_at`,
    programId,
  );
  const saved = await getActiveProgram();
  if (!saved) throw new Error('Active program upsert failed');
  return saved;
}

export async function clearActiveProgram(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM active_program WHERE id = 1`);
}

export async function markProgramWorkoutCompleted(
  programWorkoutId: number,
): Promise<ActiveProgram | null> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE active_program
       SET last_completed_program_workout_id = ?,
           updated_at = datetime('now')
     WHERE id = 1`,
    programWorkoutId,
  );
  return getActiveProgram();
}

// Calcola la prossima riga `program_workouts` da eseguire per il programma
// attivo. Strategia: cycle sul count effettivo delle righe (non su
// `daysPerWeek`, che è solo un'indicazione settimanale). Se l'ultima
// completata non è più nel programma (es. è stata rimossa), riparte dalla
// prima posizione.
export async function getNextProgramWorkout(): Promise<ProgramWorkout | null> {
  const active = await getActiveProgram();
  if (!active) return null;
  const program = await getProgramById(active.programId);
  if (!program || program.workouts.length === 0) return null;

  if (active.lastCompletedProgramWorkoutId === null) {
    return program.workouts[0];
  }
  const lastIdx = program.workouts.findIndex(
    (pw) => pw.id === active.lastCompletedProgramWorkoutId,
  );
  if (lastIdx === -1) return program.workouts[0];
  const nextIdx = (lastIdx + 1) % program.workouts.length;
  return program.workouts[nextIdx];
}

import { getDatabase } from './db';

// Layer DB per le sessioni di allenamento (Fase 3).
//
// Modello:
// - `sessions`: una riga per ogni sessione iniziata (anche se interrotta).
//   `ended_at IS NULL` ⇒ sessione attiva (max 1 alla volta, vincolo
//   applicativo). `workout_name` e `category` sono SNAPSHOT a inizio
//   sessione: se l'utente in seguito rinomina/cancella la scheda, lo
//   storico resta leggibile.
// - `session_sets`: ogni set completato dall'utente (skip = niente riga).
//   `completed_at` è il timestamp DB-side, utile per reportistica.
// - `active_session`: singleton (id=1, max 1 riga). Esiste SOLO mentre
//   c'è una sessione in corso. `paused_at` + `paused_total_sec` per
//   gestire il tempo in pausa: a `pause` setti `paused_at = now`; a
//   `resume` fai `paused_total_sec += now - paused_at` e setti
//   `paused_at = NULL`. Tempo trascorso reale =
//   (now - started_at) - paused_total_sec - (paused_at ? now - paused_at : 0).

export type Session = {
  id: number;
  workoutId: number | null;
  workoutName: string;
  category: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number | null;
  caloriesEstimated: number | null;
  notes: string | null;
};

export type SessionSet = {
  id: number;
  sessionId: number;
  exerciseId: number;
  position: number;
  setNumber: number;
  repsDone: number | null;
  weightKg: number | null;
  durationSec: number | null;
  rpe: number | null;
  completedAt: string;
};

export type ActiveSessionRow = {
  sessionId: number;
  currentExerciseIndex: number;
  currentSetNumber: number;
  restEndsAt: string | null;
  restDurationSec: number | null;
  pausedAt: string | null;
  pausedTotalSec: number;
  updatedAt: string;
};

export type NewSessionSet = Omit<
  SessionSet,
  'id' | 'sessionId' | 'completedAt'
>;

const SESSION_COLUMNS = `
  id,
  workout_id AS workoutId,
  workout_name AS workoutName,
  category,
  started_at AS startedAt,
  ended_at AS endedAt,
  duration_sec AS durationSec,
  calories_estimated AS caloriesEstimated,
  notes
`;

const SET_COLUMNS = `
  id,
  session_id AS sessionId,
  exercise_id AS exerciseId,
  position,
  set_number AS setNumber,
  reps_done AS repsDone,
  weight_kg AS weightKg,
  duration_sec AS durationSec,
  rpe,
  completed_at AS completedAt
`;

const ACTIVE_COLUMNS = `
  session_id AS sessionId,
  current_exercise_index AS currentExerciseIndex,
  current_set_number AS currentSetNumber,
  rest_ends_at AS restEndsAt,
  rest_duration_sec AS restDurationSec,
  paused_at AS pausedAt,
  paused_total_sec AS pausedTotalSec,
  updated_at AS updatedAt
`;

export async function startSession(workout: {
  id: number;
  name: string;
  category: string;
}): Promise<Session> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM active_session WHERE id = 1`,
  );
  if (existing) {
    throw new Error('Sessione già attiva');
  }
  let sessionId: number | null = null;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO sessions
         (workout_id, workout_name, category, started_at)
       VALUES (?, ?, ?, datetime('now'))`,
      workout.id,
      workout.name,
      workout.category,
    );
    sessionId = result.lastInsertRowId as number;
    await db.runAsync(
      `INSERT INTO active_session
         (id, session_id, current_exercise_index, current_set_number)
       VALUES (1, ?, 0, 1)`,
      sessionId,
    );
  });
  if (sessionId === null) throw new Error('Avvio sessione fallito');
  const created = await getSessionById(sessionId);
  if (!created) throw new Error('Avvio sessione fallito');
  return created;
}

export async function getActiveSession(): Promise<{
  session: Session;
  active: ActiveSessionRow;
} | null> {
  const db = await getDatabase();
  const active = await db.getFirstAsync<ActiveSessionRow>(
    `SELECT ${ACTIVE_COLUMNS} FROM active_session WHERE id = 1`,
  );
  if (!active) return null;
  const session = await getSessionById(active.sessionId);
  if (!session) {
    // Inconsistenza: l'active_session punta a una sessione mancante.
    // Pulisco la riga per non incastrare l'app al prossimo avvio.
    await db.runAsync(`DELETE FROM active_session WHERE id = 1`);
    return null;
  }
  return { session, active };
}

export async function recordSet(
  sessionId: number,
  set: NewSessionSet,
): Promise<SessionSet> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO session_sets
       (session_id, exercise_id, position, set_number,
        reps_done, weight_kg, duration_sec, rpe)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    sessionId,
    set.exerciseId,
    set.position,
    set.setNumber,
    set.repsDone,
    set.weightKg,
    set.durationSec,
    set.rpe,
  );
  const id = result.lastInsertRowId as number;
  const row = await db.getFirstAsync<SessionSet>(
    `SELECT ${SET_COLUMNS} FROM session_sets WHERE id = ?`,
    id,
  );
  if (!row) throw new Error('Salvataggio set fallito');
  return row;
}

export async function advanceActive(patch: {
  currentExerciseIndex?: number;
  currentSetNumber?: number;
  restEndsAt?: string | null;
  restDurationSec?: number | null;
  pausedAt?: string | null;
  pausedTotalSec?: number;
}): Promise<ActiveSessionRow> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: unknown[] = [];
  if (patch.currentExerciseIndex !== undefined) {
    fields.push('current_exercise_index = ?');
    values.push(patch.currentExerciseIndex);
  }
  if (patch.currentSetNumber !== undefined) {
    fields.push('current_set_number = ?');
    values.push(patch.currentSetNumber);
  }
  if (patch.restEndsAt !== undefined) {
    fields.push('rest_ends_at = ?');
    values.push(patch.restEndsAt);
  }
  if (patch.restDurationSec !== undefined) {
    fields.push('rest_duration_sec = ?');
    values.push(patch.restDurationSec);
  }
  if (patch.pausedAt !== undefined) {
    fields.push('paused_at = ?');
    values.push(patch.pausedAt);
  }
  if (patch.pausedTotalSec !== undefined) {
    fields.push('paused_total_sec = ?');
    values.push(patch.pausedTotalSec);
  }
  fields.push("updated_at = datetime('now')");
  await db.runAsync(
    `UPDATE active_session SET ${fields.join(', ')} WHERE id = 1`,
    ...(values as never[]),
  );
  const row = await db.getFirstAsync<ActiveSessionRow>(
    `SELECT ${ACTIVE_COLUMNS} FROM active_session WHERE id = 1`,
  );
  if (!row) throw new Error('Active session non trovata');
  return row;
}

export async function endSession(
  sessionId: number,
  data: {
    durationSec: number;
    caloriesEstimated: number;
    notes: string | null;
  },
): Promise<Session> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE sessions
         SET ended_at = datetime('now'),
             duration_sec = ?,
             calories_estimated = ?,
             notes = ?
       WHERE id = ?`,
      data.durationSec,
      data.caloriesEstimated,
      data.notes,
      sessionId,
    );
    await db.runAsync(`DELETE FROM active_session WHERE id = 1`);
  });
  const updated = await getSessionById(sessionId);
  if (!updated) throw new Error('Aggiornamento sessione fallito');
  return updated;
}

export async function cancelSession(sessionId: number): Promise<void> {
  const db = await getDatabase();
  // ON DELETE CASCADE pulisce session_sets e active_session.
  await db.runAsync(`DELETE FROM sessions WHERE id = ?`, sessionId);
}

export async function getAllSessions(): Promise<Session[]> {
  const db = await getDatabase();
  return db.getAllAsync<Session>(
    `SELECT ${SESSION_COLUMNS} FROM sessions
     WHERE ended_at IS NOT NULL
     ORDER BY started_at DESC`,
  );
}

export async function getSessionById(id: number): Promise<Session | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Session>(
    `SELECT ${SESSION_COLUMNS} FROM sessions WHERE id = ?`,
    id,
  );
  return row ?? null;
}

export async function getSessionSets(
  sessionId: number,
): Promise<SessionSet[]> {
  const db = await getDatabase();
  return db.getAllAsync<SessionSet>(
    `SELECT ${SET_COLUMNS} FROM session_sets
     WHERE session_id = ?
     ORDER BY position ASC, set_number ASC`,
    sessionId,
  );
}

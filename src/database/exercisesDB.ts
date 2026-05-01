import { getDatabase } from './db';

// Layer minimale per la libreria esercizi: in Fase 2 serve solo per
// risolvere i nomi referenziati dai preset e popolare il picker
// dell'editor scheda. La vista a sé stante con search/filter arriverà in
// Fase 4 (vedi PLAN.md §4A).

export type ExerciseLevel = 'principiante' | 'intermedio' | 'avanzato';

export type Exercise = {
  id: number;
  name: string;
  muscleGroup: string;
  equipment: string;
  level: ExerciseLevel;
  description: string | null;
  guideSteps: string[] | null;
  videoUrl: string | null;
  met: number | null;
};

type Row = {
  id: number;
  name: string;
  muscleGroup: string;
  equipment: string;
  level: ExerciseLevel;
  description: string | null;
  guideSteps: string | null;
  videoUrl: string | null;
  met: number | null;
};

const COLUMNS = `
  id,
  name,
  muscle_group AS muscleGroup,
  equipment,
  level,
  description,
  guide_steps AS guideSteps,
  video_url AS videoUrl,
  met
`;

function parseGuideSteps(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : null;
  } catch {
    return null;
  }
}

function rowToExercise(row: Row): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscleGroup,
    equipment: row.equipment,
    level: row.level,
    description: row.description,
    guideSteps: parseGuideSteps(row.guideSteps),
    videoUrl: row.videoUrl,
    met: row.met,
  };
}

export async function getAllExercises(): Promise<Exercise[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Row>(
    `SELECT ${COLUMNS} FROM exercises ORDER BY name COLLATE NOCASE ASC`,
  );
  return rows.map(rowToExercise);
}

export async function getExerciseById(id: number): Promise<Exercise | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Row>(
    `SELECT ${COLUMNS} FROM exercises WHERE id = ?`,
    id,
  );
  return row ? rowToExercise(row) : null;
}

export async function getExercisesByIds(ids: number[]): Promise<Exercise[]> {
  if (ids.length === 0) return [];
  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  const rows = await db.getAllAsync<Row>(
    `SELECT ${COLUMNS} FROM exercises WHERE id IN (${placeholders})`,
    ...ids,
  );
  return rows.map(rowToExercise);
}

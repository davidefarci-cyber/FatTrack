import type { IconName } from '@/components/Icon';
import type { Exercise } from '@/database';

// Raggruppamento client-side della libreria esercizi per `muscleGroup`.
// I valori del seed sono già label italiane TitleCase (es. "Petto",
// "Mobilità schiena") e vengono mostrati as-is nelle altre superfici
// (ExercisePickerModal, ExerciseDetailModal, WorkoutEditorModal), quindi
// non serve un mapping label-side: il titolo della sezione coincide col
// muscleGroup grezzo. Qui definiamo solo l'ORDINE in cui le sezioni
// appaiono, allineato a una progressione "alto → basso → cardio →
// mobilità" tipica delle schede. Gruppi non listati (futuri) cadono in
// fondo in ordine alfabetico.

const CANONICAL_ORDER: ReadonlyArray<string> = [
  'Petto',
  'Petto/Core',
  'Spalle',
  'Tricipiti',
  'Core',
  'Core obliqui',
  'Core basso',
  'Gambe',
  'Gambe/Cardio',
  'Glutei',
  'Full body',
  'Cardio',
  'Mobilità',
  'Mobilità anche',
  'Mobilità schiena',
  'Mobilità spalle',
  'Mobilità full body',
  'Stretching',
];

const ORDER_INDEX = new Map<string, number>(
  CANONICAL_ORDER.map((m, i) => [m, i]),
);

export type ExerciseSection = {
  title: string;
  count: number;
  data: Exercise[];
};

export function groupByMuscle(exercises: Exercise[]): ExerciseSection[] {
  const buckets = new Map<string, Exercise[]>();
  for (const ex of exercises) {
    const list = buckets.get(ex.muscleGroup);
    if (list) list.push(ex);
    else buckets.set(ex.muscleGroup, [ex]);
  }

  const sections: ExerciseSection[] = [];
  for (const [title, data] of buckets) {
    sections.push({ title, count: data.length, data });
  }

  sections.sort((a, b) => {
    const ai = ORDER_INDEX.get(a.title);
    const bi = ORDER_INDEX.get(b.title);
    if (ai !== undefined && bi !== undefined) return ai - bi;
    if (ai !== undefined) return -1;
    if (bi !== undefined) return 1;
    return a.title.localeCompare(b.title, 'it');
  });

  return sections;
}

export function exerciseCountLabel(count: number): string {
  return count === 1 ? '1 esercizio' : `${count} esercizi`;
}

// Mappa muscleGroup → IconName muscolare. Le varianti composite
// (`Petto/Core`, `Gambe/Cardio`) usano l'icona del primo termine: è
// quello dominante delle schede e la coerenza visiva conta più della
// precisione anatomica per un'icona da 24px.
export function muscleGroupToIcon(muscleGroup: string): IconName {
  const m = muscleGroup.toLowerCase();
  if (m.startsWith('petto')) return 'muscle-chest';
  if (m.startsWith('spalle')) return 'muscle-shoulders';
  if (m.startsWith('tricipiti') || m.startsWith('bicipiti') || m.startsWith('braccia'))
    return 'muscle-arm';
  if (m.startsWith('core')) return 'muscle-core';
  if (m.startsWith('glutei')) return 'muscle-glutes';
  if (m.startsWith('gambe')) return 'muscle-legs';
  if (m.startsWith('full body')) return 'muscle-fullbody';
  if (m.startsWith('cardio')) return 'muscle-cardio';
  if (m.startsWith('mobilità') || m.startsWith('stretching'))
    return 'muscle-mobility';
  return 'dumbbell';
}

import { useCallback, useSyncExternalStore } from 'react';

import { programsDB, workoutsDB } from '@/database';
import type {
  ActiveProgram,
  Program,
  ProgramWorkout,
  Workout,
} from '@/database';

// Stato condiviso del "programma attivo" (singleton). Stesso pattern di
// `useAppSettings` / `useProfile`: snapshot di modulo + listeners +
// useSyncExternalStore. Serve perché la home sport (banner "prossima
// sessione") e ProgramDetailModal (CTA "Imposta come piano attivo")
// devono restare sincronizzate dopo qualsiasi mutazione.

type Snapshot = {
  active: ActiveProgram | null;
  program: Program | null;
  nextWorkoutLink: ProgramWorkout | null;
  nextWorkout: Workout | null;
  loading: boolean;
  error: Error | null;
};

const EMPTY: Snapshot = {
  active: null,
  program: null,
  nextWorkoutLink: null,
  nextWorkout: null,
  loading: true,
  error: null,
};

let snapshot: Snapshot = EMPTY;
const listeners = new Set<() => void>();

function setSnapshot(next: Snapshot) {
  snapshot = next;
  for (const fn of listeners) fn();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function reload(): Promise<void> {
  setSnapshot({ ...snapshot, loading: true });
  try {
    const active = await programsDB.getActiveProgram();
    if (!active) {
      setSnapshot({
        active: null,
        program: null,
        nextWorkoutLink: null,
        nextWorkout: null,
        loading: false,
        error: null,
      });
      return;
    }
    const program = await programsDB.getProgramById(active.programId);
    const nextLink = await programsDB.getNextProgramWorkout();
    const nextWorkout = nextLink
      ? await workoutsDB.getWorkoutById(nextLink.workoutId)
      : null;
    setSnapshot({
      active,
      program,
      nextWorkoutLink: nextLink,
      nextWorkout,
      loading: false,
      error: null,
    });
  } catch (err) {
    setSnapshot({
      ...snapshot,
      loading: false,
      error: err instanceof Error ? err : new Error(String(err)),
    });
  }
}

let initialized = false;
function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  void reload();
}

async function setActive(programId: number): Promise<void> {
  await programsDB.setActiveProgram(programId);
  await reload();
}

async function clearActive(): Promise<void> {
  await programsDB.clearActiveProgram();
  await reload();
}

// Marca completata la prossima sessione attesa. Se la sessione completata
// non corrisponde al next previsto (l'utente ha fatto un giorno fuori
// ordine), accetta comunque l'override esplicito sul programWorkoutId.
// La logica di "qual è il prossimo dopo" sta in `getNextProgramWorkout`,
// che cicla in base al cursore.
async function markCompleted(programWorkoutId: number): Promise<void> {
  await programsDB.markProgramWorkoutCompleted(programWorkoutId);
  await reload();
}

// Cerca il programWorkout dell'attivo che usa il workoutId dato. Usato
// dal flow di `endSession` per marcare automatica la riga giusta quando
// l'utente finisce una sessione di un workout legato al programma.
// Ritorna null se non c'è programma attivo o il workout non ne fa parte.
export async function findProgramWorkoutForActive(
  workoutId: number,
): Promise<ProgramWorkout | null> {
  const active = await programsDB.getActiveProgram();
  if (!active) return null;
  const program = await programsDB.getProgramById(active.programId);
  if (!program) return null;
  return program.workouts.find((pw) => pw.workoutId === workoutId) ?? null;
}

// Forza un reload dello snapshot dall'esterno dell'hook (es. dopo che
// `endSession` ha avanzato il cursore del programma). Esposta come
// funzione di modulo per evitare di legare il context React di sessione
// allo snapshot dell'hook.
export async function reloadActiveProgram(): Promise<void> {
  await reload();
}

export type UseActiveProgramResult = {
  active: ActiveProgram | null;
  program: Program | null;
  nextWorkoutLink: ProgramWorkout | null;
  nextWorkout: Workout | null;
  loading: boolean;
  error: Error | null;
  setActive: (programId: number) => Promise<void>;
  clearActive: () => Promise<void>;
  markCompleted: (programWorkoutId: number) => Promise<void>;
  reload: () => Promise<void>;
};

export function useActiveProgram(): UseActiveProgramResult {
  ensureInitialized();
  const state = useSyncExternalStore(subscribe, () => snapshot);

  const setActiveFn = useCallback((id: number) => setActive(id), []);
  const clearActiveFn = useCallback(() => clearActive(), []);
  const markCompletedFn = useCallback(
    (id: number) => markCompleted(id),
    [],
  );
  const reloadFn = useCallback(() => reload(), []);

  return {
    active: state.active,
    program: state.program,
    nextWorkoutLink: state.nextWorkoutLink,
    nextWorkout: state.nextWorkout,
    loading: state.loading,
    error: state.error,
    setActive: setActiveFn,
    clearActive: clearActiveFn,
    markCompleted: markCompletedFn,
    reload: reloadFn,
  };
}

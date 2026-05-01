import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';

import { exercisesDB, profileDB, sessionsDB, workoutsDB } from '@/database';
import type { Exercise, Session, Workout } from '@/database';
import { estimateSessionCalories } from '@/utils/sportCalories';

// Stato globale della sessione di allenamento attiva (Fase 3).
//
// Decisioni:
// - Lo stato della "macchina" (qual è il prossimo set/esercizio) vive in
//   memoria nel provider; il DB conserva solo i campi necessari a
//   ricostruirlo a freddo (active_session row).
// - AppState: in background RN ferma il setInterval; al foreground
//   ricalcoliamo elapsed/rest dai timestamp salvati. NON ci servono
//   notifiche locali in questa fase (TODO futuro).
// - `pendingOpen`: flag che `start()` setta a true; il SportTabNavigator
//   lo osserva e apre la ActiveSessionScreen automaticamente quando una
//   sessione parte. L'UI chiama `acknowledgePendingOpen()` dopo aver
//   aperto il modal.
// - Durante la pausa: `paused_at` resta non null; il timer UI freeza.
//   Al resume aggiungiamo (now - paused_at) a `paused_total_sec` E
//   posticipiamo `restEndsAt` della stessa quantità, così il countdown
//   di recupero riparte da dove era stato interrotto.

export type ActiveSessionState = {
  session: Session;
  workout: Workout;
  exerciseMap: Map<number, Exercise>;
  currentExerciseIndex: number;
  currentSetNumber: number;
  restEndsAt: number | null;
  isPaused: boolean;
  pausedAt: number | null;
  pausedTotalSec: number;
};

export type CompleteSetData = {
  repsDone?: number;
  weightKg?: number;
  durationSec?: number;
  rpe?: number;
};

export type EndSessionResult = {
  session: Session;
  calories: number;
};

type ContextValue = {
  state: ActiveSessionState | null;
  loading: boolean;
  pendingOpen: boolean;
  acknowledgePendingOpen: () => void;
  start: (workoutId: number) => Promise<void>;
  completeSet: (data: CompleteSetData) => Promise<void>;
  skipSet: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  skipRest: () => Promise<void>;
  endSession: (notes?: string | null) => Promise<EndSessionResult>;
  cancelSession: () => Promise<void>;
};

const ActiveSessionContext = createContext<ContextValue | null>(null);

function parseSqlIso(s: string): number {
  // SQLite restituisce "YYYY-MM-DD HH:MM:SS" in UTC: serve la 'T' e la 'Z'
  // perché Date.parse sia universale tra runtime.
  if (!s) return Date.now();
  const iso = s.includes('T') ? s : `${s.replace(' ', 'T')}Z`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : Date.now();
}

export function ActiveSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ActiveSessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingOpen, setPendingOpen] = useState(false);

  // Tick periodico per forzare i re-render del banner/screen sui timer
  // in corso. Il banner ne ha bisogno per mostrare l'elapsed live; lo
  // screen per il countdown del rest. Frequenza: 1s, sufficiente.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!state) return;
    if (state.isPaused) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  // Stato corrente in ref per gli handler asincroni che non vogliono
  // chiudere su `state` (AppState change, timer callback). Sempre
  // sincronizzato col setState.
  const stateRef = useRef<ActiveSessionState | null>(null);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const hydrate = useCallback(async (): Promise<ActiveSessionState | null> => {
    const active = await sessionsDB.getActiveSession();
    if (!active) return null;
    const workout = await workoutsDB.getWorkoutById(active.session.workoutId ?? -1);
    if (!workout) {
      // Scheda cancellata mentre la sessione era attiva: cancello la
      // sessione orfana per evitare uno stato non navigabile.
      await sessionsDB.cancelSession(active.session.id);
      return null;
    }
    const ids = workout.exercises.map((e) => e.exerciseId);
    const exercises = await exercisesDB.getExercisesByIds(ids);
    const exerciseMap = new Map<number, Exercise>();
    for (const e of exercises) exerciseMap.set(e.id, e);
    const restEndsAt = active.active.restEndsAt
      ? parseSqlIso(active.active.restEndsAt)
      : null;
    return {
      session: active.session,
      workout,
      exerciseMap,
      currentExerciseIndex: active.active.currentExerciseIndex,
      currentSetNumber: active.active.currentSetNumber,
      restEndsAt,
      isPaused: active.active.pausedAt !== null,
      pausedAt: active.active.pausedAt
        ? parseSqlIso(active.active.pausedAt)
        : null,
      pausedTotalSec: active.active.pausedTotalSec,
    };
  }, []);

  // Cold start: tenta di ricostruire lo stato da DB.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await hydrate();
        if (!cancelled) setState(next);
      } catch (err) {
        console.warn('ActiveSession hydrate failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  // AppState: al ritorno in foreground ricalcoliamo lo stato dai
  // timestamp salvati. Non serve un re-fetch DB: i timer si basano già
  // su `started_at`/`restEndsAt`/`paused_at` che sono ancorati al
  // wallclock. Forziamo solo un tick per ridisegnare.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'active') {
        setTick((t) => t + 1);
      }
    });
    return () => sub.remove();
  }, []);

  const start = useCallback(
    async (workoutId: number) => {
      if (stateRef.current) {
        throw new Error('Sessione già attiva');
      }
      const workout = await workoutsDB.getWorkoutById(workoutId);
      if (!workout) throw new Error('Scheda non trovata');
      if (workout.exercises.length === 0) {
        throw new Error('La scheda non ha esercizi');
      }
      await sessionsDB.startSession({
        id: workout.id,
        name: workout.name,
        category: workout.category,
      });
      const next = await hydrate();
      setState(next);
      setPendingOpen(true);
    },
    [hydrate],
  );

  const acknowledgePendingOpen = useCallback(() => {
    setPendingOpen(false);
  }, []);

  const computeNextStep = useCallback(
    (
      current: ActiveSessionState,
    ): { exerciseIndex: number; setNumber: number; restEndsAt: number | null; finished: boolean } => {
      const ex = current.workout.exercises[current.currentExerciseIndex];
      const totalSets = ex?.sets ?? 1;
      const isLastSet = current.currentSetNumber >= totalSets;
      const isLastExercise =
        current.currentExerciseIndex >= current.workout.exercises.length - 1;
      if (isLastSet && isLastExercise) {
        return {
          exerciseIndex: current.currentExerciseIndex,
          setNumber: current.currentSetNumber,
          restEndsAt: null,
          finished: true,
        };
      }
      if (isLastSet) {
        const nextEx = current.workout.exercises[current.currentExerciseIndex + 1];
        const restSec = ex?.restSec ?? 0;
        return {
          exerciseIndex: current.currentExerciseIndex + 1,
          setNumber: 1,
          restEndsAt: restSec > 0 ? Date.now() + restSec * 1000 : null,
          finished: false,
        };
      }
      const restSec = ex?.restSec ?? 0;
      return {
        exerciseIndex: current.currentExerciseIndex,
        setNumber: current.currentSetNumber + 1,
        restEndsAt: restSec > 0 ? Date.now() + restSec * 1000 : null,
        finished: false,
      };
    },
    [],
  );

  const advance = useCallback(
    async (
      current: ActiveSessionState,
      next: { exerciseIndex: number; setNumber: number; restEndsAt: number | null },
    ) => {
      const restIso = next.restEndsAt
        ? new Date(next.restEndsAt).toISOString()
        : null;
      await sessionsDB.advanceActive({
        currentExerciseIndex: next.exerciseIndex,
        currentSetNumber: next.setNumber,
        restEndsAt: restIso,
      });
      setState({
        ...current,
        currentExerciseIndex: next.exerciseIndex,
        currentSetNumber: next.setNumber,
        restEndsAt: next.restEndsAt,
      });
    },
    [],
  );

  const completeSet = useCallback(
    async (data: CompleteSetData) => {
      const current = stateRef.current;
      if (!current) return;
      const ex = current.workout.exercises[current.currentExerciseIndex];
      if (!ex) return;
      await sessionsDB.recordSet(current.session.id, {
        exerciseId: ex.exerciseId,
        position: current.currentExerciseIndex,
        setNumber: current.currentSetNumber,
        repsDone: data.repsDone ?? null,
        weightKg: data.weightKg ?? null,
        durationSec: data.durationSec ?? null,
        rpe: data.rpe ?? null,
      });
      const next = computeNextStep(current);
      await advance(current, next);
    },
    [computeNextStep, advance],
  );

  const skipSet = useCallback(async () => {
    const current = stateRef.current;
    if (!current) return;
    const next = computeNextStep(current);
    await advance(current, next);
  }, [computeNextStep, advance]);

  const pause = useCallback(async () => {
    const current = stateRef.current;
    if (!current || current.isPaused) return;
    const pausedAtMs = Date.now();
    const pausedAtIso = new Date(pausedAtMs).toISOString();
    await sessionsDB.advanceActive({ pausedAt: pausedAtIso });
    setState({ ...current, isPaused: true, pausedAt: pausedAtMs });
  }, []);

  const resume = useCallback(async () => {
    const current = stateRef.current;
    if (!current || !current.isPaused || current.pausedAt === null) return;
    const pauseDeltaSec = Math.max(
      0,
      Math.round((Date.now() - current.pausedAt) / 1000),
    );
    const newPausedTotalSec = current.pausedTotalSec + pauseDeltaSec;
    // Posticipiamo restEndsAt della durata della pausa così il countdown
    // riparte da dove era stato interrotto.
    const newRestEndsAt = current.restEndsAt
      ? current.restEndsAt + pauseDeltaSec * 1000
      : null;
    const newRestIso = newRestEndsAt
      ? new Date(newRestEndsAt).toISOString()
      : null;
    await sessionsDB.advanceActive({
      pausedAt: null,
      pausedTotalSec: newPausedTotalSec,
      restEndsAt: newRestIso,
    });
    setState({
      ...current,
      isPaused: false,
      pausedAt: null,
      pausedTotalSec: newPausedTotalSec,
      restEndsAt: newRestEndsAt,
    });
  }, []);

  const skipRest = useCallback(async () => {
    const current = stateRef.current;
    if (!current || current.restEndsAt === null) return;
    await sessionsDB.advanceActive({ restEndsAt: null });
    setState({ ...current, restEndsAt: null });
  }, []);

  const endSession = useCallback(
    async (notes?: string | null): Promise<EndSessionResult> => {
      const current = stateRef.current;
      if (!current) throw new Error('Nessuna sessione attiva');
      const startedMs = parseSqlIso(current.session.startedAt);
      const pauseDeltaNow =
        current.isPaused && current.pausedAt !== null
          ? Math.max(0, Math.round((Date.now() - current.pausedAt) / 1000))
          : 0;
      const elapsedSec = Math.max(
        0,
        Math.round((Date.now() - startedMs) / 1000) -
          current.pausedTotalSec -
          pauseDeltaNow,
      );
      // Carico i set salvati dalla fonte di verità (DB).
      const sets = await sessionsDB.getSessionSets(current.session.id);
      const profile = await profileDB.getProfile();
      const weightKg = profile?.weightKg ?? 70;
      const setsForCalc = sets.map((s) => {
        const ex = current.exerciseMap.get(s.exerciseId);
        return {
          met: ex?.met ?? null,
          durationSec: s.durationSec,
        };
      });
      const calories = estimateSessionCalories({
        weightKg,
        sets: setsForCalc,
      });
      const updated = await sessionsDB.endSession(current.session.id, {
        durationSec: elapsedSec,
        caloriesEstimated: calories,
        notes: notes ?? null,
      });
      setState(null);
      return { session: updated, calories };
    },
    [],
  );

  const cancelSession = useCallback(async () => {
    const current = stateRef.current;
    if (!current) return;
    await sessionsDB.cancelSession(current.session.id);
    setState(null);
  }, []);

  const value = useMemo<ContextValue>(
    () => ({
      state,
      loading,
      pendingOpen,
      acknowledgePendingOpen,
      start,
      completeSet,
      skipSet,
      pause,
      resume,
      skipRest,
      endSession,
      cancelSession,
    }),
    [
      state,
      loading,
      pendingOpen,
      acknowledgePendingOpen,
      start,
      completeSet,
      skipSet,
      pause,
      resume,
      skipRest,
      endSession,
      cancelSession,
    ],
  );

  return (
    <ActiveSessionContext.Provider value={value}>
      {children}
    </ActiveSessionContext.Provider>
  );
}

export function useActiveSession(): ContextValue {
  const ctx = useContext(ActiveSessionContext);
  if (!ctx) {
    throw new Error(
      'useActiveSession must be used within an ActiveSessionProvider',
    );
  }
  return ctx;
}

// Helper esposto per l'UI: tempo trascorso dalla sessione, scontando
// le pause (sia quelle già completate via `pausedTotalSec`, sia quella
// eventualmente in corso via `pausedAt`). Pure function: il chiamante
// può ri-renderlo a frequenza arbitraria (banner: 1s, screen: idem).
export function getElapsedSec(state: ActiveSessionState): number {
  const startedMs = parseSqlIso(state.session.startedAt);
  const baseSec = Math.max(0, Math.round((Date.now() - startedMs) / 1000));
  const currentPauseSec =
    state.isPaused && state.pausedAt !== null
      ? Math.max(0, Math.round((Date.now() - state.pausedAt) / 1000))
      : 0;
  return Math.max(0, baseSec - state.pausedTotalSec - currentPauseSec);
}

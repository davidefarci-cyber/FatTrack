import { useCallback, useEffect, useRef, useState } from 'react';

import { useActiveSession } from '@/contexts/ActiveSessionContext';
import { sessionsDB } from '@/database';
import type { Session } from '@/database';

// Aggregazioni per la dashboard sport (Fase 4):
// - Settimana: lunedì 00:00 locale → ora; conta giorni distinti, minuti
//   totali, calorie totali. Target settimanale hardcoded a 4 (configurabile
//   in fase 5 dalle SportSettings).
// - Last: la sessione più recente conclusa, con count di esercizi distinti
//   e set totali (utile per la card "Ultimo allenamento").
//
// Re-fetch automatico quando la sessione attiva si chiude (transizione
// state ≠ null → null nel context). In più espone `reload()` per chi
// volesse forzare un refresh.

const WEEKLY_TARGET_DAYS = 4;

export type WeekStats = {
  daysTrained: number;
  totalMinutes: number;
  totalCalories: number;
  weeklyTarget: number;
};

export type LastSession = {
  session: Session;
  exerciseCount: number;
  setCount: number;
} | null;

export type SportStats = {
  loading: boolean;
  week: WeekStats;
  last: LastSession;
  reload: () => Promise<void>;
};

const EMPTY_WEEK: WeekStats = {
  daysTrained: 0,
  totalMinutes: 0,
  totalCalories: 0,
  weeklyTarget: WEEKLY_TARGET_DAYS,
};

function startOfCurrentWeekMs(now = new Date()): number {
  // Lunedì come inizio settimana (Europe/Rome convenzione). `getDay()`
  // ritorna 0 per domenica, 1..6 lun..sab — compensiamo con +6 mod 7.
  const day = now.getDay();
  const diff = (day + 6) % 7;
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - diff,
    0,
    0,
    0,
    0,
  );
  return monday.getTime();
}

function parseSqlIso(s: string): number {
  if (!s) return Date.now();
  const iso = s.includes('T') ? s : `${s.replace(' ', 'T')}Z`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : Date.now();
}

function localDayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function useSportStats(): SportStats {
  const { state: activeSessionState } = useActiveSession();
  const [loading, setLoading] = useState(true);
  const [week, setWeek] = useState<WeekStats>(EMPTY_WEEK);
  const [last, setLast] = useState<LastSession>(null);

  const reload = useCallback(async () => {
    try {
      const sessions = await sessionsDB.getAllSessions();
      const startWeek = startOfCurrentWeekMs();

      const distinctDays = new Set<string>();
      let totalMinutes = 0;
      let totalCalories = 0;
      for (const s of sessions) {
        const startedMs = parseSqlIso(s.startedAt);
        if (startedMs < startWeek) continue;
        distinctDays.add(localDayKey(startedMs));
        if (s.durationSec) totalMinutes += Math.round(s.durationSec / 60);
        if (s.caloriesEstimated) totalCalories += s.caloriesEstimated;
      }
      setWeek({
        daysTrained: distinctDays.size,
        totalMinutes,
        totalCalories,
        weeklyTarget: WEEKLY_TARGET_DAYS,
      });

      const lastSession = sessions[0] ?? null;
      if (lastSession) {
        const sets = await sessionsDB.getSessionSets(lastSession.id);
        const exerciseIds = new Set<number>();
        for (const set of sets) exerciseIds.add(set.exerciseId);
        setLast({
          session: lastSession,
          exerciseCount: exerciseIds.size,
          setCount: sets.length,
        });
      } else {
        setLast(null);
      }
    } catch {
      setWeek(EMPTY_WEEK);
      setLast(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Re-fetch quando la sessione attiva si chiude. Tracciamo la transizione
  // state non-null → null tramite ref, evitando trigger spuri ad ogni
  // re-render.
  const prevActiveRef = useRef<boolean>(activeSessionState !== null);
  useEffect(() => {
    const prev = prevActiveRef.current;
    const now = activeSessionState !== null;
    prevActiveRef.current = now;
    if (prev && !now) {
      void reload();
    }
  }, [activeSessionState, reload]);

  return { loading, week, last, reload };
}

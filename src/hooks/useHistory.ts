import { useCallback, useEffect, useMemo, useState } from 'react';

import { mealsDB, settingsDB } from '@/database';
import { useProfile } from '@/hooks/useProfile';

import { shiftDateISO, todayISO } from './useDailyLog';

export type HistoryPeriod = 7 | 30;

export type HistoryDay = {
  // Data ISO YYYY-MM-DD.
  date: string;
  // Etichetta corta per asse X (es. "lun", "15").
  shortLabel: string;
  // Etichetta estesa per dettaglio/tooltip (es. "Lun 15 mar").
  fullLabel: string;
  calories: number;
  // calories - target. Positivo = oltre target, negativo = sotto.
  delta: number;
  overTarget: boolean;
};

type UseHistoryResult = {
  period: HistoryPeriod;
  setPeriod: (p: HistoryPeriod) => void;
  targetCalories: number;
  // Ordinato dal più vecchio al più recente: comodo per grafico ascendente.
  days: HistoryDay[];
  // Media semplice (somma / n) — include giorni a zero calorie.
  averageCalories: number;
  // Numero di giorni con calorie entro target (strettamente inferiori al target
  // oppure esattamente 0: i giorni senza dati non contano come "fuori").
  daysInTarget: number;
  daysOverTarget: number;
  // Quanti giorni hanno almeno un pasto registrato.
  daysWithData: number;
  loading: boolean;
  reload: () => Promise<void>;
};

const FALLBACK_TARGET_KCAL = 2000;

const WEEKDAY_SHORT_IT = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'] as const;
const MONTH_SHORT_IT = [
  'gen', 'feb', 'mar', 'apr', 'mag', 'giu',
  'lug', 'ago', 'set', 'ott', 'nov', 'dic',
] as const;

export function useHistory(initialPeriod: HistoryPeriod = 7): UseHistoryResult {
  const { targetCalories: profileTarget } = useProfile();
  const [period, setPeriod] = useState<HistoryPeriod>(initialPeriod);
  const [rawTotals, setRawTotals] = useState<Map<string, number>>(new Map());
  const [fallbackTarget, setFallbackTarget] = useState<number>(FALLBACK_TARGET_KCAL);
  const [loading, setLoading] = useState(true);

  // Il target proviene dal profilo; se il profilo non è configurato usiamo
  // il singleton daily_settings (2000 kcal di default) come fallback.
  useEffect(() => {
    settingsDB
      .getSettings()
      .then((s) => setFallbackTarget(s.targetCalories))
      .catch(() => undefined);
  }, []);

  const targetCalories = profileTarget ?? fallbackTarget;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const today = todayISO();
      const from = shiftDateISO(today, -(period - 1));
      const meals = await mealsDB.listMealsByDateRange(from, today);
      const totals = new Map<string, number>();
      for (const meal of meals) {
        totals.set(meal.date, (totals.get(meal.date) ?? 0) + meal.caloriesTotal);
      }
      setRawTotals(totals);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    reload();
  }, [reload]);

  const days = useMemo<HistoryDay[]>(() => {
    const today = todayISO();
    const out: HistoryDay[] = [];
    for (let i = period - 1; i >= 0; i--) {
      const iso = shiftDateISO(today, -i);
      const calories = Math.round(rawTotals.get(iso) ?? 0);
      const delta = Math.round(calories - targetCalories);
      out.push({
        date: iso,
        shortLabel: shortLabelForPeriod(iso, period),
        fullLabel: fullLabel(iso),
        calories,
        delta,
        overTarget: calories > targetCalories,
      });
    }
    return out;
  }, [rawTotals, period, targetCalories]);

  const averageCalories = useMemo(() => {
    if (days.length === 0) return 0;
    const sum = days.reduce((s, d) => s + d.calories, 0);
    return Math.round(sum / days.length);
  }, [days]);

  const daysOverTarget = useMemo(
    () => days.filter((d) => d.overTarget).length,
    [days],
  );

  const daysWithData = useMemo(
    () => days.filter((d) => d.calories > 0).length,
    [days],
  );

  // Giorni "in target": ci sono dati e le calorie non superano il target.
  const daysInTarget = useMemo(
    () => days.filter((d) => d.calories > 0 && !d.overTarget).length,
    [days],
  );

  return {
    period,
    setPeriod,
    targetCalories,
    days,
    averageCalories,
    daysInTarget,
    daysOverTarget,
    daysWithData,
    loading,
    reload,
  };
}

// ---------- helpers etichette ----------

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function shortLabelForPeriod(iso: string, period: HistoryPeriod): string {
  const date = parseISO(iso);
  if (period <= 7) {
    return WEEKDAY_SHORT_IT[date.getDay()];
  }
  // Per 30 giorni mostriamo il numero del giorno (l'asse X è troppo fitto
  // per weekday+date; il grafico poi mostra solo alcune tick).
  return String(date.getDate());
}

function fullLabel(iso: string): string {
  const date = parseISO(iso);
  const wd = WEEKDAY_SHORT_IT[date.getDay()];
  const month = MONTH_SHORT_IT[date.getMonth()];
  const capitalized = wd.charAt(0).toUpperCase() + wd.slice(1);
  return `${capitalized} ${date.getDate()} ${month}`;
}

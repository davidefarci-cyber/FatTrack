import { useMemo, useState } from 'react';

import { mealsStore } from '@/database';
import type { Meal } from '@/database';
import { useProfile } from '@/hooks/useProfile';
import { DEFAULT_TARGET_KCAL } from '@/utils/calorieCalculator';

import { shiftDateISO, todayISO } from './useDailyLog';

export type HistoryPeriod = 7 | 30;

// Tolleranza simmetrica per considerare un giorno "in target" (±10 %).
// Costante esposta per consentire override futuri (es. 5 % strict / 15 % rilassato).
export const TARGET_TOLERANCE_RATIO = 0.10;

// Range fisso usato dal calcolo degli insight, indipendente dal periodo di
// visualizzazione: streak, trend (7+7 gg) e best day richiedono almeno 14
// giorni e tipicamente vogliamo una finestra di 30. Il chart e la tabella
// continuano a usare `period` per la visualizzazione.
const INSIGHTS_DAYS = 30;

export type HistoryInsights = {
  // Giorni consecutivi che includono oggi in cui le calorie sono entro
  // `target ± 10 %`. 0 se oggi non è in target o non è registrato.
  streakDays: number;
  // Differenza in kcal fra la media degli ultimi 7 gg e quella dei 7 gg
  // precedenti. `null` quando non c'è abbastanza dato.
  trendKcalDelta: number | null;
  trendDirection: 'up' | 'down' | 'flat';
  // Giorno con la minor distanza assoluta dal target (esclusi i giorni vuoti).
  bestDay: { date: string; fullLabel: string; deltaKcal: number } | null;
};

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
  // True quando il profilo utente non è ancora configurato. Le viste insight
  // mostrano in questo caso una CTA verso Settings invece dei numeri.
  hasProfileTarget: boolean;
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
  insights: HistoryInsights;
  loading: boolean;
};

const WEEKDAY_SHORT_IT = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'] as const;
const MONTH_SHORT_IT = [
  'gen', 'feb', 'mar', 'apr', 'mag', 'giu',
  'lug', 'ago', 'set', 'ott', 'nov', 'dic',
] as const;

export function useHistory(initialPeriod: HistoryPeriod = 7): UseHistoryResult {
  const { targetCalories: profileTarget } = useProfile();
  const [period, setPeriod] = useState<HistoryPeriod>(initialPeriod);

  const today = todayISO();
  // Finestra fissa di INSIGHTS_DAYS giorni: copre sia la visualizzazione
  // (max 30) sia il calcolo degli insight (richiede 14+).
  const insightsFrom = shiftDateISO(today, -(INSIGHTS_DAYS - 1));
  const { mealsByDate, loading } = mealsStore.useMealsForRange(insightsFrom, today);

  const hasProfileTarget = profileTarget !== null && profileTarget > 0;
  const targetCalories = profileTarget ?? DEFAULT_TARGET_KCAL;

  const days = useMemo<HistoryDay[]>(() => {
    const out: HistoryDay[] = [];
    for (let i = period - 1; i >= 0; i--) {
      const iso = shiftDateISO(today, -i);
      const dayMeals = mealsByDate.get(iso) ?? [];
      const calories = Math.round(
        dayMeals.reduce((sum, m) => sum + m.caloriesTotal, 0),
      );
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
  }, [mealsByDate, period, targetCalories, today]);

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

  const insights = useMemo<HistoryInsights>(() => {
    if (!hasProfileTarget) {
      return {
        streakDays: 0,
        trendKcalDelta: null,
        trendDirection: 'flat',
        bestDay: null,
      };
    }
    const totals = totalsFromMealsByDate(mealsByDate);
    return {
      streakDays: computeStreak(totals, targetCalories, today),
      ...computeTrend(totals, today),
      bestDay: computeBestDay(totals, targetCalories),
    };
  }, [mealsByDate, hasProfileTarget, targetCalories, today]);

  return {
    period,
    setPeriod,
    targetCalories,
    hasProfileTarget,
    days,
    averageCalories,
    daysInTarget,
    daysOverTarget,
    daysWithData,
    insights,
    loading,
  };
}

// ---------- algoritmi insight ----------

function totalsFromMealsByDate(
  mealsByDate: ReadonlyMap<string, ReadonlyArray<Meal>>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const [date, meals] of mealsByDate) {
    let sum = 0;
    for (const m of meals) sum += m.caloriesTotal;
    map.set(date, sum);
  }
  return map;
}

function computeStreak(
  totals: Map<string, number>,
  target: number,
  today: string,
): number {
  if (target <= 0) return 0;
  const tolerance = target * TARGET_TOLERANCE_RATIO;
  let count = 0;
  // Iterazione all'indietro da oggi: ci fermiamo al primo giorno fuori
  // tolleranza o senza pasti (giorno vuoto = streak interrotta).
  for (let i = 0; i < 365; i++) {
    const d = shiftDateISO(today, -i);
    const kcal = totals.get(d);
    if (kcal === undefined || kcal === 0) break;
    if (Math.abs(kcal - target) > tolerance) break;
    count += 1;
  }
  return count;
}

function computeTrend(
  totals: Map<string, number>,
  today: string,
): { trendKcalDelta: number | null; trendDirection: 'up' | 'down' | 'flat' } {
  const last = sumRange(totals, today, 0, 7);
  const prev = sumRange(totals, today, 7, 14);
  if (last.days === 0 || prev.days === 0) {
    return { trendKcalDelta: null, trendDirection: 'flat' };
  }
  const avgLast = last.sum / last.days;
  const avgPrev = prev.sum / prev.days;
  const delta = Math.round(avgLast - avgPrev);
  // Soglia "stabile" piccola: variazioni inferiori a 30 kcal/gg sono
  // sotto il rumore di misura (porzioni stimate, errori di pesatura).
  const direction =
    Math.abs(delta) < 30 ? 'flat' : delta > 0 ? 'up' : 'down';
  return { trendKcalDelta: delta, trendDirection: direction };
}

function sumRange(
  totals: Map<string, number>,
  today: string,
  fromDayAgo: number,
  toDayAgo: number,
): { sum: number; days: number } {
  let sum = 0;
  let days = 0;
  for (let i = fromDayAgo; i < toDayAgo; i++) {
    const d = shiftDateISO(today, -i);
    const kcal = totals.get(d) ?? 0;
    if (kcal > 0) {
      sum += kcal;
      days += 1;
    }
  }
  return { sum, days };
}

function computeBestDay(
  totals: Map<string, number>,
  target: number,
): { date: string; fullLabel: string; deltaKcal: number } | null {
  if (target <= 0) return null;
  let best: { date: string; deltaKcal: number } | null = null;
  for (const [date, kcal] of totals) {
    if (kcal <= 0) continue;
    const delta = Math.abs(kcal - target);
    if (best === null || delta < best.deltaKcal) {
      best = { date, deltaKcal: Math.round(delta) };
    }
  }
  if (best === null) return null;
  return { ...best, fullLabel: fullLabel(best.date) };
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

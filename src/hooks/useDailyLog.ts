import { useCallback, useMemo, useState } from 'react';

import { mealsStore } from '@/database';
import type { Meal, MealType, NewMeal } from '@/database';

export type MealsByType = Record<MealType, Meal[]>;

export type NewMealInput = Omit<NewMeal, 'date'>;

export type DailyMacroTotals = {
  protein: number;
  carbs: number;
  fat: number;
};

type UseDailyLogResult = {
  // Data correntemente visualizzata in formato ISO 'YYYY-MM-DD'.
  date: string;
  // Etichetta localizzata pronta per l'UI (Oggi / Ieri / Domani / weekday+day+month).
  dateLabel: string;
  // True quando `date` coincide con oggi.
  isToday: boolean;
  loading: boolean;
  meals: Meal[];
  // Pasti raggruppati per tipo, sempre nell'ordine colazione → spuntino.
  mealsByType: MealsByType;
  totalCalories: number;
  // Somma giornaliera dei macro snapshot (in grammi). I pasti senza macro
  // (legacy, OFF privi di dati nutrizionali, add-on) contribuiscono 0,
  // così la barra mostra il progresso parziale solo dei pasti tracciati.
  macros: DailyMacroTotals;
  addMeal: (input: NewMealInput) => Promise<Meal>;
  addMeals: (inputs: NewMealInput[]) => Promise<Meal[]>;
  removeMeal: (id: number) => Promise<void>;
  goToPreviousDay: () => void;
  goToNextDay: () => void;
  goToToday: () => void;
  setDate: (iso: string) => void;
};

const EMPTY_BY_TYPE: MealsByType = {
  colazione: [],
  pranzo: [],
  cena: [],
  spuntino: [],
};

export function useDailyLog(initialDate?: string): UseDailyLogResult {
  const [date, setDate] = useState<string>(initialDate ?? todayISO());
  const { meals: mealsRO, loading } = mealsStore.useMealsForDate(date);

  const meals = useMemo(() => (mealsRO ? [...mealsRO] : []), [mealsRO]);

  const mealsByType = useMemo<MealsByType>(() => {
    if (meals.length === 0) return EMPTY_BY_TYPE;
    const out: MealsByType = {
      colazione: [],
      pranzo: [],
      cena: [],
      spuntino: [],
    };
    for (const meal of meals) {
      out[meal.mealType].push(meal);
    }
    return out;
  }, [meals]);

  const totalCalories = useMemo(
    () => meals.reduce((sum, m) => sum + m.caloriesTotal, 0),
    [meals],
  );

  const macros = useMemo<DailyMacroTotals>(() => {
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    for (const m of meals) {
      if (m.proteinTotal !== null) protein += m.proteinTotal;
      if (m.carbsTotal !== null) carbs += m.carbsTotal;
      if (m.fatTotal !== null) fat += m.fatTotal;
    }
    return { protein, carbs, fat };
  }, [meals]);

  const addMeal = useCallback(
    (input: NewMealInput): Promise<Meal> =>
      mealsStore.createMeal({ ...input, date }),
    [date],
  );

  const addMeals = useCallback(
    (inputs: NewMealInput[]): Promise<Meal[]> =>
      mealsStore.createMeals(inputs.map((i) => ({ ...i, date }))),
    [date],
  );

  const removeMeal = useCallback(
    (id: number): Promise<void> => mealsStore.deleteMeal(id),
    [],
  );

  const goToPreviousDay = useCallback(() => {
    setDate((d) => shiftDateISO(d, -1));
  }, []);

  const goToNextDay = useCallback(() => {
    setDate((d) => shiftDateISO(d, 1));
  }, []);

  const goToToday = useCallback(() => {
    setDate(todayISO());
  }, []);

  const dateLabel = useMemo(() => formatDateLabel(date), [date]);
  const isToday = date === todayISO();

  return {
    date,
    dateLabel,
    isToday,
    loading,
    meals,
    mealsByType,
    totalCalories,
    macros,
    addMeal,
    addMeals,
    removeMeal,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    setDate,
  };
}

// ----- helpers data -----

export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftDateISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

function formatDateLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return 'Oggi';
  if (iso === shiftDateISO(today, -1)) return 'Ieri';
  if (iso === shiftDateISO(today, 1)) return 'Domani';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  const formatted = date.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  // Prima lettera maiuscola per coerenza col design (Lun 15 mar).
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

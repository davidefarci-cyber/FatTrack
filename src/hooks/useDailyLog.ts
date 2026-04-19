import { useCallback, useEffect, useMemo, useState } from 'react';

import { mealsDB } from '@/database';
import type { Meal, MealType, NewMeal } from '@/database';

export type MealsByType = Record<MealType, Meal[]>;

export type NewMealInput = Omit<NewMeal, 'date'>;

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
  addMeal: (input: NewMealInput) => Promise<Meal>;
  addMeals: (inputs: NewMealInput[]) => Promise<Meal[]>;
  removeMeal: (id: number) => Promise<void>;
  goToPreviousDay: () => void;
  goToNextDay: () => void;
  goToToday: () => void;
  setDate: (iso: string) => void;
  reload: () => Promise<void>;
};

const EMPTY_BY_TYPE: MealsByType = {
  colazione: [],
  pranzo: [],
  cena: [],
  spuntino: [],
};

export function useDailyLog(initialDate?: string): UseDailyLogResult {
  const [date, setDate] = useState<string>(initialDate ?? todayISO());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await mealsDB.listMealsByDate(date);
      setMeals(rows);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    reload();
  }, [reload]);

  const mealsByType = useMemo<MealsByType>(() => {
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

  const addMeal = useCallback(
    async (input: NewMealInput): Promise<Meal> => {
      const created = await mealsDB.createMeal({ ...input, date });
      await reload();
      return created;
    },
    [date, reload],
  );

  const addMeals = useCallback(
    async (inputs: NewMealInput[]): Promise<Meal[]> => {
      const created = await Promise.all(
        inputs.map((i) => mealsDB.createMeal({ ...i, date })),
      );
      await reload();
      return created;
    },
    [date, reload],
  );

  const removeMeal = useCallback(
    async (id: number): Promise<void> => {
      await mealsDB.deleteMeal(id);
      // Update ottimistico + reload: la rimozione è monotona,
      // l'aggiornamento locale evita flash nella UI mentre il reload conferma.
      setMeals((prev) => prev.filter((m) => m.id !== id));
      await reload();
    },
    [reload],
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
    mealsByType: meals.length === 0 ? EMPTY_BY_TYPE : mealsByType,
    totalCalories,
    addMeal,
    addMeals,
    removeMeal,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    setDate,
    reload,
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

import { useEffect, useSyncExternalStore } from 'react';

import * as mealsDB from './mealsDB';
import type { Meal, NewMeal } from './mealsDB';

// Store reattivo per i pasti registrati. Tutti i consumer (useDailyLog,
// useHistory, AddFoodSheet, BarcodeScreen, useFavorites.addToDay) passano
// da qui invece di chiamare mealsDB direttamente: una scrittura fatta da
// uno qualsiasi di loro notifica gli altri tramite useSyncExternalStore.
//
// Cache lazy: `Map<dateISO, Meal[]>`. La snapshot esposta è la mappa stessa,
// ma con identità nuova a ogni notify (clone shallow) così React rileva il
// cambiamento. Le date toccate da una mutazione vengono ricaricate via SQL
// per riusare l'ordinamento canonico (CASE meal_type, created_at).

type Snapshot = ReadonlyMap<string, ReadonlyArray<Meal>>;

let snapshot: Snapshot = new Map();
const listeners = new Set<() => void>();
const inflight = new Map<string, Promise<Meal[]>>();

function notify(next: Map<string, ReadonlyArray<Meal>>) {
  snapshot = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Snapshot {
  return snapshot;
}

async function reloadDate(date: string): Promise<Meal[]> {
  const existing = inflight.get(date);
  if (existing) return existing;
  const promise = mealsDB
    .listMealsByDate(date)
    .then((rows) => {
      const next = new Map(snapshot);
      next.set(date, rows);
      notify(next);
      return rows;
    })
    .finally(() => {
      inflight.delete(date);
    });
  inflight.set(date, promise);
  return promise;
}

async function ensureDate(date: string): Promise<Meal[]> {
  const cached = snapshot.get(date);
  if (cached) return cached as Meal[];
  return reloadDate(date);
}

function findCachedDateForMeal(id: number): string | null {
  for (const [date, meals] of snapshot) {
    if (meals.some((m) => m.id === id)) return date;
  }
  return null;
}

async function reloadAllCachedDates(): Promise<void> {
  const dates = Array.from(snapshot.keys());
  await Promise.all(dates.map(reloadDate));
}

export async function createMeal(meal: NewMeal): Promise<Meal> {
  const created = await mealsDB.createMeal(meal);
  await reloadDate(created.date);
  return created;
}

export async function createMeals(meals: NewMeal[]): Promise<Meal[]> {
  const created: Meal[] = [];
  for (const m of meals) created.push(await mealsDB.createMeal(m));
  const touched = new Set(created.map((m) => m.date));
  await Promise.all(Array.from(touched).map(reloadDate));
  return created;
}

export async function updateMeal(
  id: number,
  patch: Partial<NewMeal>,
): Promise<Meal | null> {
  const oldDate = findCachedDateForMeal(id);
  const updated = await mealsDB.updateMeal(id, patch);
  if (!updated) return null;
  const dates = new Set<string>();
  if (oldDate) dates.add(oldDate);
  dates.add(updated.date);
  await Promise.all(Array.from(dates).map(reloadDate));
  return updated;
}

export async function deleteMeal(id: number): Promise<void> {
  const knownDate = findCachedDateForMeal(id);
  await mealsDB.deleteMeal(id);
  if (knownDate) {
    await reloadDate(knownDate);
  } else {
    // Caso improbabile (cache fredda): ricarichiamo tutte le date in cache
    // per coerenza, anche se in pratica nessuno cancella un pasto che
    // non è mai stato osservato.
    await reloadAllCachedDates();
  }
}

export function getMealsForDate(date: string): ReadonlyArray<Meal> | undefined {
  return snapshot.get(date);
}

// Hook che restituisce i pasti di una data. Innesca il primo load on-mount
// e si re-sottoscrive automaticamente a ogni notify.
export function useMealsForDate(date: string): {
  meals: ReadonlyArray<Meal> | undefined;
  loading: boolean;
} {
  const map = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const meals = map.get(date);

  useEffect(() => {
    void ensureDate(date);
  }, [date]);

  return { meals, loading: meals === undefined };
}

// Hook che restituisce i pasti per un range di date (inclusi gli estremi),
// usato dallo Storico. Garantisce che ogni data nel range venga caricata.
export function useMealsForRange(
  fromDate: string,
  toDate: string,
): {
  mealsByDate: ReadonlyMap<string, ReadonlyArray<Meal>>;
  loading: boolean;
} {
  const map = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const dates = enumerateDates(fromDate, toDate);

  useEffect(() => {
    for (const d of dates) void ensureDate(d);
    // dates è derivato da from/to: dipendere dalle stringhe è sufficiente
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  const slice = new Map<string, ReadonlyArray<Meal>>();
  let loading = false;
  for (const d of dates) {
    const cached = map.get(d);
    if (cached === undefined) loading = true;
    else slice.set(d, cached);
  }
  return { mealsByDate: slice, loading };
}

function enumerateDates(fromISO: string, toISO: string): string[] {
  const out: string[] = [];
  const [fy, fm, fd] = fromISO.split('-').map(Number);
  const [ty, tm, td] = toISO.split('-').map(Number);
  const cursor = new Date(fy, (fm ?? 1) - 1, fd ?? 1);
  const end = new Date(ty, (tm ?? 1) - 1, td ?? 1);
  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    out.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

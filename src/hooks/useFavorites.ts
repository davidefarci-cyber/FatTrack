import { useCallback, useEffect, useState } from 'react';

import { favoritesDB, mealsStore } from '@/database';
import type { Favorite, MealType, NewFavorite } from '@/database';

type UseFavoritesResult = {
  favorites: Favorite[];
  loading: boolean;
  reload: () => Promise<void>;
  createFavorite: (input: NewFavorite) => Promise<Favorite>;
  updateFavorite: (id: number, patch: Partial<NewFavorite>) => Promise<Favorite | null>;
  deleteFavorite: (id: number) => Promise<void>;
  // Scrive ogni item del preferito come riga in `meals` per la data/meal
  // specificati. Usato sia dalla FavoritesScreen (add rapido al diario)
  // sia dal FavoritesModal in Home.
  addToDay: (favorite: Favorite, mealType: MealType, date: string) => Promise<void>;
};

export function useFavorites(): UseFavoritesResult {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await favoritesDB.listFavorites();
      setFavorites(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const createFavorite = useCallback(
    async (input: NewFavorite): Promise<Favorite> => {
      const created = await favoritesDB.createFavorite(input);
      await reload();
      return created;
    },
    [reload],
  );

  const updateFavorite = useCallback(
    async (id: number, patch: Partial<NewFavorite>): Promise<Favorite | null> => {
      const updated = await favoritesDB.updateFavorite(id, patch);
      await reload();
      return updated;
    },
    [reload],
  );

  const deleteFavorite = useCallback(
    async (id: number): Promise<void> => {
      await favoritesDB.deleteFavorite(id);
      // Update ottimistico: come in useDailyLog, rimuoviamo subito l'elemento
      // dalla lista locale prima del reload DB per evitare flash nella UI.
      setFavorites((prev) => prev.filter((f) => f.id !== id));
      await reload();
    },
    [reload],
  );

  const addToDay = useCallback(
    async (favorite: Favorite, mealType: MealType, date: string): Promise<void> => {
      // Passiamo dallo store così tutti gli altri consumer (Home, Storico)
      // si rinfrescano in automatico.
      await mealsStore.createMeals(
        favorite.items.map((item) => ({
          date,
          mealType,
          foodId: item.foodId,
          foodName: item.foodName,
          grams: item.grams,
          caloriesTotal: item.calories,
        })),
      );
    },
    [],
  );

  return {
    favorites,
    loading,
    reload,
    createFavorite,
    updateFavorite,
    deleteFavorite,
    addToDay,
  };
}

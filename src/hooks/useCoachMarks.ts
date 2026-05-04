import { useCallback, useEffect, useMemo, useState } from 'react';

import { favoritesDB, mealsDB } from '@/database';
import { useAppSettings } from '@/hooks/useAppSettings';
import type { CoachMarkId, CoachMarkState } from '@/utils/coachMarks';
import { pickNextMark } from '@/utils/coachMarks';

// Hook che orchestra il coach mark engine:
//  - legge i flag `coachMarksSeen` + `sportModeSeen` da useAppSettings
//  - ricalcola i count globali (meals totali, giorni distinti, preferiti)
//    quando `revision` viene bumpato (manuale via `refresh()`)
//  - espone `currentId` (il prossimo hint da mostrare) + azioni di dismiss
//
// Il count "today" lo passa il caller (HomeScreen lo ha già da useDailyLog),
// così il hook non duplica una sottoscrizione a mealsStore per la data corrente.
//
// Note di reattività:
//  - `refresh()` va chiamato dopo azioni che cambiano i count: salvataggio
//    preferito (in HomeScreen via cuore), creazione meal (mealsStore re-render
//    di HomeScreen → todayMealsCount cambia → si rievaluta predicate).
//  - i predicate sono monotoni nelle direzioni che ci interessano: una volta
//    superato un milestone e marcato "seen", non torna più indietro.

type UseCoachMarksOptions = {
  todayMealsCount: number;
};

type UseCoachMarksResult = {
  currentId: CoachMarkId | null;
  refresh: () => void;
  dismiss: (id: CoachMarkId) => Promise<void>;
};

export function useCoachMarks({
  todayMealsCount,
}: UseCoachMarksOptions): UseCoachMarksResult {
  const {
    coachMarksSeen,
    sportModeSeen,
    appMode,
    markCoachMarkSeen,
    markSportModeSeen,
  } = useAppSettings();

  const [counts, setCounts] = useState<{
    totalMeals: number;
    daysWithMeals: number;
    favorites: number;
    loaded: boolean;
  }>({ totalMeals: 0, daysWithMeals: 0, favorites: 0, loaded: false });

  // Bump per ri-fetch on demand. Non usiamo un counter sequenziale per evitare
  // overflow teorici; basta cambiare identità.
  const [revision, setRevision] = useState({});

  useEffect(() => {
    let active = true;
    Promise.all([
      mealsDB.countAllMeals(),
      mealsDB.countDistinctDays(),
      favoritesDB.countFavorites(),
    ])
      .then(([totalMeals, daysWithMeals, favorites]) => {
        if (!active) return;
        setCounts({ totalMeals, daysWithMeals, favorites, loaded: true });
      })
      .catch(() => {
        // Errori SQL improbabili: lasciamo i count a 0, niente coach mark
        // sarebbe peggio dell'attuale (nessun hint mostrato).
        if (active) setCounts((c) => ({ ...c, loaded: true }));
      });
    return () => {
      active = false;
    };
  }, [revision]);

  const state: CoachMarkState = useMemo(
    () => ({
      totalMealsCount: counts.totalMeals,
      todayMealsCount,
      favoritesCount: counts.favorites,
      daysWithMealsCount: counts.daysWithMeals,
    }),
    [counts, todayMealsCount],
  );

  const currentId = useMemo(() => {
    if (!counts.loaded) return null;
    return pickNextMark(state, coachMarksSeen, { appMode, sportModeSeen });
  }, [state, coachMarksSeen, appMode, sportModeSeen, counts.loaded]);

  const refresh = useCallback(() => setRevision({}), []);

  const dismiss = useCallback(
    async (id: CoachMarkId) => {
      // Per sportMode marchiamo anche `sport_mode_seen` (legacy flag),
      // così il vecchio gating diet-side resta coerente.
      if (id === 'sportMode') {
        await markSportModeSeen();
      }
      await markCoachMarkSeen(id);
    },
    [markSportModeSeen, markCoachMarkSeen],
  );

  return { currentId, refresh, dismiss };
}

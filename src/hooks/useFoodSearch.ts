import { useEffect, useState } from 'react';

import { foodsDB } from '@/database';
import type { Food } from '@/database';
import { offSearch } from '@/utils/openFoodFacts';
import type { OffProduct } from '@/utils/openFoodFacts';

// Hook condiviso che incapsula la ricerca cibo "DB locale + Open Food Facts"
// originariamente vissuta dentro `AddFoodSheet > SearchTab`. Lo riusano:
// - AddFoodSheet (tab "Cerca")
// - FavoriteEditorModal (per popolare un preferito)
// - FoodSearchScreen (lookup informativo read-only)
//
// Comportamento 1:1 con la logica originale:
// - localResults: lista a 30 item, fallback su listFoods(30) quando query vuota.
// - remoteResults: query OFF debounced 400 ms, attivata solo da query >= 2 char,
//   con AbortController per cancellare richieste obsolete.
// - retry(): ri-triggera la fetch OFF senza modificare la query.
// - enabled (default true): consente al consumer di sospendere le query quando
//   il proprio sheet/tab non è in primo piano.

const SEARCH_DEBOUNCE_MS = 400;

export type UseFoodSearchOptions = {
  enabled?: boolean;
};

export type UseFoodSearchResult = {
  query: string;
  setQuery: (q: string) => void;
  localResults: Food[];
  remoteResults: OffProduct[];
  loadingRemote: boolean;
  remoteError: string | null;
  retry: () => void;
};

export function useFoodSearch(opts?: UseFoodSearchOptions): UseFoodSearchResult {
  const enabled = opts?.enabled ?? true;
  const [query, setQuery] = useState('');
  const [localResults, setLocalResults] = useState<Food[]>([]);
  const [remoteResults, setRemoteResults] = useState<OffProduct[]>([]);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const trimmed = query.trim();
    const promise = trimmed.length === 0
      ? foodsDB.listFoods(30)
      : foodsDB.searchFoods(trimmed, 30);
    promise
      .then((rows) => {
        if (active) setLocalResults(rows);
      })
      .catch(() => {
        if (active) setLocalResults([]);
      });
    return () => {
      active = false;
    };
  }, [query, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setRemoteResults([]);
      setLoadingRemote(false);
      setRemoteError(null);
      return;
    }
    const controller = new AbortController();
    const handle = setTimeout(() => {
      setLoadingRemote(true);
      setRemoteError(null);
      offSearch(trimmed, controller.signal)
        .then((products) => {
          setRemoteResults(products);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setRemoteResults([]);
          setRemoteError(
            err instanceof Error ? err.message : 'Impossibile contattare Open Food Facts',
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoadingRemote(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [query, retryTick, enabled]);

  return {
    query,
    setQuery,
    localResults,
    remoteResults,
    loadingRemote,
    remoteError,
    retry: () => setRetryTick((n) => n + 1),
  };
}

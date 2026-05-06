import { useCallback, useEffect, useState } from 'react';

import { programsDB } from '@/database';
import type { Program } from '@/database';

// Lista programmi (preset + utente, ordinata da `getAllPrograms`).
// Hook locale, non condiviso: ogni schermata che lo usa fa la sua query.
// Niente listeners qui — il numero di programmi è piccolo e la lista non
// cambia di frequente; le mutazioni usano `reload()` esplicito.

type UsePrograms = {
  programs: Program[];
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
};

export function usePrograms(): UsePrograms {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await programsDB.getAllPrograms();
      setPrograms(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { programs, loading, error, reload };
}

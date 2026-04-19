import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import type { UserPreferences } from '@/types';

const STORAGE_KEY = '@fattrack/preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  dailyKcalTarget: 2000,
  dailyFatTargetG: 70,
  units: 'metric',
  theme: 'system',
};

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(raw) });
      })
      .finally(() => setLoading(false));
  }, []);

  const update = useCallback(async (patch: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  return { preferences, update, loading };
}

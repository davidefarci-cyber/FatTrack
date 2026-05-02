import * as Haptics from 'expo-haptics';

import { appSettingsDB } from '@/database';

// Helper centralizzato per i feedback aptici. Tutti i call-site (RestTimer
// fine recupero, "Set completato", long-press switch modalità, toggle
// Settings) passano da qui — così il flag `hapticEnabled` di app_settings
// disabilita davvero TUTTE le vibrazioni con una sola riga.
//
// Cache locale del flag per evitare una query DB a ogni vibrazione. Va
// invalidata via `invalidateHapticCache()` quando l'utente cambia il
// toggle in Settings/SportSettings.

let cachedEnabled: boolean | null = null;

export async function refreshHapticPreference(): Promise<void> {
  try {
    const settings = await appSettingsDB.getAppSettings();
    cachedEnabled = settings.hapticEnabled;
  } catch {
    cachedEnabled = true;
  }
}

export function invalidateHapticCache(): void {
  cachedEnabled = null;
}

async function ensureLoaded(): Promise<boolean> {
  if (cachedEnabled === null) await refreshHapticPreference();
  return cachedEnabled ?? true;
}

export async function lightHaptic(): Promise<void> {
  if (!(await ensureLoaded())) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export async function successHaptic(): Promise<void> {
  if (!(await ensureLoaded())) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => {},
  );
}

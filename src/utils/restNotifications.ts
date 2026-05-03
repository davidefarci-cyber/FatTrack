import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Helper centralizzato per le notifiche locali "fine recupero" (TODO [16]).
// MVP: solo Android. iOS richiederebbe APNs / EAS push tokens, fuori scope
// per ora.
//
// Singola notifica scheduled per volta: chi schedula prima cancella la
// vecchia. La cache `hasPermission` evita di richiamare il prompt di
// sistema o di chiedere lo stato a ogni rest. Va invalidata se l'utente
// cambia i permessi dalle impostazioni di sistema (chiamare
// `invalidatePermissionCache()` da una hook AppState dedicata se serve;
// per il MVP basta il check on first call).

let hasPermission: boolean | null = null;
let activeNotificationId: string | null = null;

export async function ensurePermission(): Promise<boolean> {
  if (hasPermission !== null) return hasPermission;
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status === 'granted') {
      hasPermission = true;
      return true;
    }
    if (status === 'undetermined' || (status === 'denied' && canAskAgain)) {
      const r = await Notifications.requestPermissionsAsync();
      hasPermission = r.status === 'granted';
      return hasPermission;
    }
    hasPermission = false;
    return false;
  } catch {
    hasPermission = false;
    return false;
  }
}

export async function scheduleRestEndNotification(seconds: number): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  await cancelRestEndNotification();
  const ok = await ensurePermission();
  if (!ok) return;
  try {
    activeNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Recupero finito',
        body: 'Tocca per continuare l\'allenamento.',
        sound: 'default',
      },
      trigger: { seconds: Math.max(1, Math.round(seconds)) },
    });
  } catch {
    activeNotificationId = null;
  }
}

export async function cancelRestEndNotification(): Promise<void> {
  if (!activeNotificationId) return;
  const id = activeNotificationId;
  activeNotificationId = null;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Notifica gia' scattata o cancellata: niente da fare.
  }
}

export function invalidatePermissionCache(): void {
  hasPermission = null;
}

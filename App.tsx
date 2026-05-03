import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ModeTransitionOverlay } from '@/components/sport/ModeTransitionOverlay';
import { ToastProvider } from '@/components/Toast';
import { ActiveSessionProvider } from '@/contexts/ActiveSessionContext';
import { getDatabase } from '@/database';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useFonts } from '@/hooks/useFonts';
import { RootNavigator } from '@/navigation';
import { checkForUpdates } from '@/utils/updateChecker';

// Notifiche locali (TODO [16]): handler globale per la presentazione in
// foreground. Le notifiche programmate da `restNotifications.ts` mostrano
// alert + suono anche se l'app e' aperta — coerente con il caso d'uso
// (utente in pausa, magari ha messo via il telefono ma e' tornato in app).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Wrapper interno: legge `appMode` dallo store condiviso e monta
// l'overlay di transizione SOPRA RootNavigator. È un componente
// separato perché l'overlay deve poter sovrastare l'intero
// NavigationContainer (status area inclusa, copre via
// StyleSheet.absoluteFillObject) ma vuole leggere lo store di
// appSettings, e qui siamo già sotto SafeAreaProvider/ToastProvider.
function AppContent() {
  const { appMode } = useAppSettings();
  return (
    <>
      <RootNavigator />
      <ModeTransitionOverlay mode={appMode} />
    </>
  );
}

export default function App() {
  const { fontsLoaded, fontError } = useFonts();

  useEffect(() => {
    getDatabase().catch((err) => console.warn('DB init failed', err));
    // Fire-and-forget: il check versione non deve bloccare il lancio
    // e gestisce internamente gli errori di rete.
    checkForUpdates();
  }, []);

  // Niente UI finché i font del design non sono pronti: evita il flash
  // con il font di sistema. In caso di errore font procediamo comunque,
  // meglio un fallback che un'app bloccata.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ToastProvider>
          <ActiveSessionProvider>
            <StatusBar style="dark" />
            <AppContent />
          </ActiveSessionProvider>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

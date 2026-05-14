import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ModeTransitionOverlay } from '@/components/sport/ModeTransitionOverlay';
import { ToastProvider } from '@/components/Toast';
import { UpcomingSheet } from '@/components/UpcomingSheet';
import { ActiveSessionProvider } from '@/contexts/ActiveSessionContext';
import { getDatabase } from '@/database';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useFonts } from '@/hooks/useFonts';
import { RootNavigator } from '@/navigation';
import { checkForUpdates } from '@/utils/updateChecker';
import {
  checkForUpcoming,
  dismissUpcoming,
  type UpcomingItem,
} from '@/utils/upcomingChecker';

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
  const [upcomingItems, setUpcomingItems] = useState<UpcomingItem[]>([]);

  useEffect(() => {
    getDatabase().catch((err) => console.warn('DB init failed', err));

    // Cold-start: prima il check update (azionabile), poi il teaser
    // upcoming SOLO se l'update non ha aperto un alert. Evita due
    // popup sovrapposti: se c'è un aggiornamento da fare, l'utente lo
    // vedrà; il teaser apparirà al prossimo cold-start.
    void (async () => {
      const updateResult = await checkForUpdates();
      if (updateResult === 'prompted') return;
      const items = await checkForUpcoming();
      if (items.length > 0) setUpcomingItems(items);
    })();
  }, []);

  const handleDismissUpcoming = () => {
    void dismissUpcoming(upcomingItems);
    setUpcomingItems([]);
  };

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
            <UpcomingSheet
              visible={upcomingItems.length > 0}
              items={upcomingItems}
              onClose={handleDismissUpcoming}
            />
          </ActiveSessionProvider>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

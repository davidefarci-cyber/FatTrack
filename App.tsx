import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/Toast';
import { getDatabase } from '@/database';
import { useFonts } from '@/hooks/useFonts';
import { RootNavigator } from '@/navigation';
import { checkForUpdates } from '@/utils/updateChecker';

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
          <StatusBar style="dark" />
          <RootNavigator />
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

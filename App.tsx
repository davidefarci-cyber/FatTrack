import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getDatabase } from '@/database';
import { useFonts } from '@/hooks/useFonts';
import { RootNavigator } from '@/navigation';

export default function App() {
  const { fontsLoaded, fontError } = useFonts();

  useEffect(() => {
    getDatabase().catch((err) => console.warn('DB init failed', err));
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
        <StatusBar style="dark" />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

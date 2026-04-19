import { useEffect } from 'react';
import {
  useFonts as useExpoFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as SplashScreen from 'expo-splash-screen';

// Manteniamo la splash screen visibile finché i font non sono pronti:
// Plus Jakarta Sans è la base tipografica del design handoff, non possiamo
// renderizzare prima che sia disponibile o vedremmo un "flash" con il font
// di sistema.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Best-effort: se la splash era già nascosta ignoriamo l'errore.
});

export function useFonts(): { fontsLoaded: boolean; fontError: Error | null } {
  const [fontsLoaded, fontError] = useExpoFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {
        // Ignore: splash potrebbe essere già nascosta.
      });
    }
  }, [fontsLoaded, fontError]);

  return { fontsLoaded, fontError };
}

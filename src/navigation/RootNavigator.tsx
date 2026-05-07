import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';

import { useAppSettings } from '@/hooks/useAppSettings';
import { useProfile } from '@/hooks/useProfile';
import OnboardingScreen from '@/screens/OnboardingScreen';
import { ThemeProvider } from '@/theme/ThemeContext';
import type { SportTabParamList, TabParamList } from '@/types';

import { MainTabNavigator } from './MainTabNavigator';
import { SportTabNavigator } from './SportTabNavigator';

// Esposto come singleton per agganciare il back handler hardware (Android)
// dentro MainTabNavigator / SportTabNavigator senza passare ref via props.
// Il container è uno solo: monta `MainTabNavigator` (diet) o
// `SportTabNavigator` (sport) in base ad `appMode`. La firma tipizzata
// copre entrambi i set di rotte (la chiave comune `Home` è quella usata
// effettivamente dal back-handler).
export const navigationRef = createNavigationContainerRef<
  TabParamList | SportTabParamList
>();

// Navigatore radice: al primo avvio controlla il profilo salvato in SQLite.
// Se manca mostra l'OnboardingScreen (fuori dal tab navigator), altrimenti
// sceglie il navigator in base alla modalità app (diet vs sport).
// Lo stato profilo e quello appMode sono entrambi condivisi
// (useSyncExternalStore in useProfile / useAppSettings): un cambio di
// modalità rerendera questo componente e monta l'altro tab navigator.
//
// `key={appMode}` su NavigationContainer forza un full-remount del
// container ad ogni switch di modalità. Senza key, il container
// preservava la propria navigation state attraverso il cambio di
// child: se l'utente era su un route che non esiste nel nuovo
// navigator (es. `Workouts` in fit → swap a fat), il container
// ricadeva sul primo tab dichiarato (`Barcode` in fat) ignorando
// `initialRouteName="Home"`. Bug "atterro su BarcodeScreen invece
// che Home" (vedi TODO [44]). Il remount è coperto visivamente da
// ModeTransitionOverlay (~1500ms cross-fade in App.tsx).
export function RootNavigator() {
  const { profile, loading: profileLoading } = useProfile();
  const { appMode, loading: settingsLoading } = useAppSettings();

  if (profileLoading || settingsLoading) {
    return null;
  }

  return (
    <ThemeProvider mode={appMode}>
      <NavigationContainer ref={navigationRef} key={appMode}>
        {profile === null ? (
          <OnboardingScreen />
        ) : appMode === 'sport' ? (
          <SportTabNavigator />
        ) : (
          <MainTabNavigator />
        )}
      </NavigationContainer>
    </ThemeProvider>
  );
}

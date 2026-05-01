import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';

import { useProfile } from '@/hooks/useProfile';
import OnboardingScreen from '@/screens/OnboardingScreen';
import type { SportTabParamList, TabParamList } from '@/types';

import { MainTabNavigator } from './MainTabNavigator';

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
// porta direttamente al MainTabNavigator con la HomeScreen come initialRoute.
// Lo stato profilo è condiviso (vedi useProfile): quando OnboardingScreen
// salva o SettingsScreen cancella il profilo, questo componente si aggiorna
// automaticamente senza flag locali.
export function RootNavigator() {
  const { profile, loading } = useProfile();

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {profile === null ? <OnboardingScreen /> : <MainTabNavigator />}
    </NavigationContainer>
  );
}

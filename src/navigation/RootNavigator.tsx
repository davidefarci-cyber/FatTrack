import { NavigationContainer } from '@react-navigation/native';

import { useProfile } from '@/hooks/useProfile';
import OnboardingScreen from '@/screens/OnboardingScreen';

import { MainTabNavigator } from './MainTabNavigator';

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
    <NavigationContainer>
      {profile === null ? <OnboardingScreen /> : <MainTabNavigator />}
    </NavigationContainer>
  );
}

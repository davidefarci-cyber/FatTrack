import { NavigationContainer } from '@react-navigation/native';
import { useState } from 'react';

import { useProfile } from '@/hooks/useProfile';
import OnboardingScreen from '@/screens/OnboardingScreen';

import { MainTabNavigator } from './MainTabNavigator';

// Navigatore radice: al primo avvio controlla il profilo salvato in SQLite.
// Se manca mostra l'OnboardingScreen (fuori dal tab navigator), altrimenti
// porta direttamente al MainTabNavigator con la HomeScreen come initialRoute.
// `onboardingComplete` è uno switch locale per passare ai tab subito dopo
// il salvataggio del profilo senza aspettare un refetch asincrono.
export function RootNavigator() {
  const { profile, loading } = useProfile();
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  if (loading) {
    return null;
  }

  const needsOnboarding = !profile && !onboardingComplete;

  return (
    <NavigationContainer>
      {needsOnboarding ? (
        <OnboardingScreen onComplete={() => setOnboardingComplete(true)} />
      ) : (
        <MainTabNavigator />
      )}
    </NavigationContainer>
  );
}

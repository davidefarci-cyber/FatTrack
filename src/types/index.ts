import type { NavigatorScreenParams } from '@react-navigation/native';

import type { MealType } from '@/database';

// Navigazione: il design FatTrack ha un singolo bottom-tab navigator a 5 tab,
// ordine da design Scansiona · Preferiti · Home (FAB centrale) · Storico · Impostazioni.
export type TabParamList = {
  Barcode: undefined;
  Favorites: undefined;
  Home: undefined;
  History: undefined;
  Settings: undefined;
};

// Stack radice: racchiude il bottom-tab e aggiunge schermate full-screen
// raggiungibili via navigation.navigate (es. AddFood dal + di ogni pasto).
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList> | undefined;
  AddFood: { mealType: MealType; date: string };
};

export type UserPreferences = {
  dailyKcalTarget: number;
  dailyFatTargetG: number;
  units: 'metric' | 'imperial';
  theme: 'light' | 'dark' | 'system';
};

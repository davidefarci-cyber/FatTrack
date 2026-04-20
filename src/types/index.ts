import type { NavigatorScreenParams } from '@react-navigation/native';

import type { MealType } from '@/database';

// Stack della tab Home: HomeMain è la schermata diario, AddFood è il flusso
// di aggiunta alimento raggiunto via navigation.navigate('AddFood', …).
// Restare dentro lo stack della Home consente di mantenere la tab bar visibile
// quando serve e di evitare un RootStack globale solo per un detail screen.
export type HomeStackParamList = {
  HomeMain: undefined;
  AddFood: { mealType: MealType; date: string };
};

// Bottom tab a 4 voci (design aggiornato): Home · Preferiti · Storico · Impostazioni.
// Home è nested con il proprio stack (HomeStackParamList) perché contiene
// il detail AddFood.
export type TabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined;
  Favorites: undefined;
  History: undefined;
  Settings: undefined;
};

export type UserPreferences = {
  dailyKcalTarget: number;
  dailyFatTargetG: number;
  units: 'metric' | 'imperial';
  theme: 'light' | 'dark' | 'system';
};

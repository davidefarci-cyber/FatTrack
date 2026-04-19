// Navigazione: il design FatTrack ha un singolo bottom-tab navigator a 5 tab,
// ordine da design Scansiona · Preferiti · Home (FAB centrale) · Storico · Impostazioni.
export type TabParamList = {
  Barcode: undefined;
  Favorites: undefined;
  Home: undefined;
  History: undefined;
  Settings: undefined;
};

export type UserPreferences = {
  dailyKcalTarget: number;
  dailyFatTargetG: number;
  units: 'metric' | 'imperial';
  theme: 'light' | 'dark' | 'system';
};

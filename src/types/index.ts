// Bottom tab a 5 voci (design originale): Barcode · Preferiti · Home · Storico · Impostazioni.
// La Home è centrale nell'UI e ha uno stato locale per aprire il bottom-sheet
// AddFood — non è più nested in uno stack dedicato.
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

export type RootStackParamList = {
  Tabs: undefined;
  Scanner: undefined;
  ProductDetail: { barcode: string };
};

export type TabParamList = {
  Home: undefined;
  Diary: undefined;
  Stats: undefined;
  Settings: undefined;
};

export type UserPreferences = {
  dailyKcalTarget: number;
  dailyFatTargetG: number;
  units: 'metric' | 'imperial';
  theme: 'light' | 'dark' | 'system';
};

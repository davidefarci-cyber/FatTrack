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

export type Product = {
  id: number;
  barcode: string;
  name: string;
  brand?: string;
  kcalPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
  proteinPer100g: number;
  createdAt: string;
};

export type DiaryEntry = {
  id: number;
  productId: number;
  grams: number;
  consumedAt: string;
};

export type UserPreferences = {
  dailyKcalTarget: number;
  dailyFatTargetG: number;
  units: 'metric' | 'imperial';
  theme: 'light' | 'dark' | 'system';
};

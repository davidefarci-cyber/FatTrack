// Design tokens FatTrack — derivati dal design handoff
// (design/fattrack/project/fattrack-ui.jsx, oggetto FT).
// Questa è la fonte di verità stilistica per l'intera app:
// ogni schermata/componente nuovi devono usare questi token.

import type { TextStyle } from 'react-native';

export const colors = {
  bg: '#F4F6FB',
  card: '#FFFFFF',
  green: '#06C167',
  greenLight: '#E6FBF0',
  red: '#FF4757',
  redLight: '#FFF1F2',
  orange: '#FF9F43',
  orangeLight: '#FFF4E6',
  blue: '#4C6EF5',
  blueLight: '#EEF2FF',
  purple: '#CC5DE8',
  purpleLight: '#F8F0FF',
  text: '#1E2532',
  textSec: '#8892A4',
  border: '#EDF0F7',
  overlay: 'rgba(30, 37, 50, 0.55)',
} as const;

export type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const mealPalette: Record<MealKey, { color: string; bg: string; label: string }> = {
  breakfast: { color: colors.orange, bg: colors.orangeLight, label: 'Colazione' },
  lunch: { color: colors.green, bg: colors.greenLight, label: 'Pranzo' },
  dinner: { color: colors.blue, bg: colors.blueLight, label: 'Cena' },
  snack: { color: colors.purple, bg: colors.purpleLight, label: 'Spuntino' },
};

// Ombre: il design ha due livelli. In RN le traduciamo in elevation (Android)
// + shadowColor/Offset/Opacity/Radius (iOS). Applicare via `style={shadows.sm}`.
export const shadows = {
  sm: {
    shadowColor: '#1E2532',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  md: {
    shadowColor: '#1E2532',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 32,
    elevation: 8,
  },
} as const;

export const radii = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
  xxl: 16,
  round: 99,
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 14,
  xxxl: 16,
  screen: 20,
} as const;

export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

// Scala tipografica mappata dal design (FT.font Plus Jakarta Sans).
// Ogni voce è un oggetto TextStyle plug-and-play per componenti RN.
export const typography = {
  // Titoli pagina (Impostazioni, Storico, Preferiti): fontSize 20, weight 800.
  h1: {
    fontFamily: fontFamily.extrabold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.text,
  },
  // Numero grande CalorieRing, valori onboarding.
  display: {
    fontFamily: fontFamily.extrabold,
    fontSize: 25,
    lineHeight: 28,
    color: colors.text,
  },
  // Valori evidenziati (kcal consumate, totali card).
  value: {
    fontFamily: fontFamily.extrabold,
    fontSize: 22,
    lineHeight: 26,
    color: colors.text,
  },
  // Body pasti/alimenti (nome alimento).
  body: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  bodyRegular: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  // Valori inline, prezzi calorie inline.
  bodyBold: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
  // Label e metadata secondaria.
  caption: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSec,
  },
  // Label uppercase tipo "RIMANENTI" / section headers.
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSec,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Testo bottoni tab bar / micro metadata.
  micro: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    lineHeight: 13,
    color: colors.textSec,
  },
} satisfies Record<string, TextStyle>;

export const theme = {
  colors,
  mealPalette,
  shadows,
  radii,
  spacing,
  fontFamily,
  typography,
};

export type Theme = typeof theme;

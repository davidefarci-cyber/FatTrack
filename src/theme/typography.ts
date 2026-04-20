// Scala tipografica FatTrack — mappata dal design (FT.font Plus Jakarta Sans).
// Ogni voce è un TextStyle plug-and-play; usare questi preset invece di
// dichiarare fontSize/fontWeight inline nelle schermate.

import type { TextStyle } from 'react-native';

import { colors } from './colors';

export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

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

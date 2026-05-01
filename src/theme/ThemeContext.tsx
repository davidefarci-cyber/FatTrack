import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

import { colors } from './index';
import { sportColors } from './sportMode';
import type { AppMode } from '@/database';

// Provider del tema "modale": espone i token di accent dipendenti dalla
// modalità corrente (diet → verde, sport → arancio). I primitives che
// devono cambiare colore con la modalità (FAB, BottomTabBar focused tint,
// CalorieRing) leggono questi token via `useAppTheme()`.
//
// I token NEUTRI (text, bg, card, border, ombre, tipografia, mealPalette)
// restano in `src/theme/index.ts` e non passano da qui: non cambiano tra
// le due modalità e non hanno motivo di triggerare un rerender.

export type AppThemeTokens = {
  mode: AppMode;
  accent: string;
  accentDark: string;
  accentSoft: string;
  ring: string;
  bgTint: string;
};

const DIET_THEME: AppThemeTokens = {
  mode: 'diet',
  accent: colors.green,
  accentDark: '#048C49',
  accentSoft: colors.greenLight,
  ring: colors.green,
  bgTint: colors.greenLight,
};

const SPORT_THEME: AppThemeTokens = {
  mode: 'sport',
  accent: sportColors.accent,
  accentDark: sportColors.accentDark,
  accentSoft: sportColors.accentSoft,
  ring: sportColors.ring,
  bgTint: sportColors.bgTint,
};

const ThemeContext = createContext<AppThemeTokens>(DIET_THEME);

type ThemeProviderProps = {
  mode: AppMode;
  children: ReactNode;
};

export function ThemeProvider({ mode, children }: ThemeProviderProps) {
  const value = useMemo(() => (mode === 'sport' ? SPORT_THEME : DIET_THEME), [mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): AppThemeTokens {
  return useContext(ThemeContext);
}

// Design tokens FatTrack — derivati dal design handoff
// (design/fattrack/project/fattrack-ui.jsx, oggetto FT).
// Questa è la fonte di verità stilistica per l'intera app:
// ogni schermata/componente nuovi devono usare questi token.

export { colors, mealPalette } from './colors';
export type { MealKey } from './colors';
export { fontFamily, typography } from './typography';

import { colors, mealPalette } from './colors';
import { fontFamily, typography } from './typography';

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

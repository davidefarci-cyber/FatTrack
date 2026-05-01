// Palette dedicata della modalità Sport — accento arancio "energia".
// È un set parallelo a quello di `colors.ts`: NON sostituisce i token diet.
// I primitives theme-aware (FAB, BottomTabBar, CalorieRing, …) leggono
// l'accent corrente da `useAppTheme()` (vedi `ThemeContext.tsx`).
//
// Nome del wordmark in modalità sport: lato `app.json` resta "FatTrack",
// internamente esponiamo "FitTrack" come costante per il logo/header
// (verrà usato dal Fase 5 quando arriva l'asset definitivo).

export const sportColors = {
  accent: '#FF7A1A',
  accentDark: '#D45C00',
  accentSoft: '#FFE0C8',
  bgTint: '#FFF6EE',
  ring: '#FF7A1A',
  success: '#06C167',
  warning: '#FFB020',
} as const;

export const APP_NAME_SPORT = 'FitTrack';

export type SportCategory =
  | 'forza'
  | 'cardio'
  | 'mobilita'
  | 'misto'
  | 'recupero';

export const sportPalette: Record<
  SportCategory,
  { color: string; bg: string; label: string }
> = {
  forza: { color: '#FF7A1A', bg: '#FFE0C8', label: 'Forza' },
  cardio: { color: '#FF4757', bg: '#FFF1F2', label: 'Cardio' },
  mobilita: { color: '#4C6EF5', bg: '#EEF2FF', label: 'Mobilità' },
  // Schede ibride forza+cardio (vedi `WorkoutCategory` in workoutsDB):
  // colore neutro/ricco per distinguerle dalle tre categorie pure.
  misto: { color: '#CC5DE8', bg: '#F8F0FF', label: 'Misto' },
  recupero: { color: '#06C167', bg: '#E6FBF0', label: 'Recupero' },
};

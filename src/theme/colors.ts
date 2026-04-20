// Palette FatTrack — derivata dal design handoff (design/fattrack/project/fattrack-ui.jsx).
// Questi valori sono la fonte di verità per tutti i colori dell'app: nessuna
// schermata dovrebbe introdurre hex arbitrari, ma estendere questa palette.

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

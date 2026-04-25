import type { ActivityLevel, Gender } from '@/database';
import type { OptionItem } from '@/components/OptionSelect';

// Single source of truth per le opzioni di profilo. Sono usate sia da
// `OnboardingScreen` (con icona emoji) sia da `SettingsScreen` (lista
// `OptionSelect`, l'icona è ignorata): mantenere qui label e descrizioni
// evita drift tra le due schermate.

export type ProfileOption<T extends string | number> = OptionItem<T> & {
  // Emoji opzionale mostrata nelle card grandi (Onboarding). Le liste
  // compatte (Settings) la ignorano.
  icon?: string;
};

export const GENDER_OPTIONS: ReadonlyArray<{ value: Gender; label: string }> = [
  { value: 'M', label: 'Uomo' },
  { value: 'F', label: 'Donna' },
];

export const ACTIVITY_OPTIONS: ReadonlyArray<ProfileOption<ActivityLevel>> = [
  {
    value: 1,
    icon: '🪑',
    label: 'Sedentario',
    description: 'Ufficio, poco moto',
  },
  {
    value: 2,
    icon: '🚶',
    label: 'Leggero',
    description: '1–3 allenamenti/sett',
  },
  {
    value: 3,
    icon: '🚴',
    label: 'Moderato',
    description: '3–5 allenamenti/sett',
  },
  {
    value: 4,
    icon: '🏋️',
    label: 'Attivo',
    description: '6–7 allenamenti/sett',
  },
  {
    value: 5,
    icon: '⚡',
    label: 'Intensivo',
    description: 'Doppi allenamenti',
  },
];

export const WEEKLY_GOAL_OPTIONS: ReadonlyArray<ProfileOption<number>> = [
  {
    value: 0.25,
    label: '–0,25 kg / settimana',
    description: 'Lento e costante',
  },
  {
    value: 0.5,
    label: '–0,5 kg / settimana',
    description: 'Consigliato',
  },
  {
    value: 0.75,
    label: '–0,75 kg / settimana',
    description: 'Impegnativo',
  },
  {
    value: 1,
    label: '–1 kg / settimana',
    description: 'Aggressivo',
  },
];

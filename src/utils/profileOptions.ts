import type { ActivityLevel, Gender } from '@/database';
import type { OptionItem } from '@/components/OptionSelect';

// Opzioni condivise tra OnboardingScreen e SettingsScreen:
// stessi identici label/descrizioni per tenere allineato il profilo.

export const GENDER_OPTIONS: ReadonlyArray<{ value: Gender; label: string }> = [
  { value: 'M', label: 'Uomo' },
  { value: 'F', label: 'Donna' },
];

export const ACTIVITY_OPTIONS: ReadonlyArray<OptionItem<ActivityLevel>> = [
  {
    value: 1,
    label: 'Sedentario',
    description: 'Lavoro al pc, nessuno sport',
  },
  {
    value: 2,
    label: 'Leggero',
    description: 'Allenamento 1-3 volte a settimana',
  },
  {
    value: 3,
    label: 'Moderato',
    description: 'Allenamento 3-5 volte a settimana',
  },
  {
    value: 4,
    label: 'Attivo',
    description: 'Allenamento 6-7 volte a settimana',
  },
  {
    value: 5,
    label: 'Molto attivo',
    description: 'Lavoro fisico o allenamento quotidiano intenso',
  },
];

export const WEEKLY_GOAL_OPTIONS: ReadonlyArray<OptionItem<number>> = [
  {
    value: 0.25,
    label: '-0,25 kg a settimana',
    description: 'Deficit morbido, percorso lungo',
  },
  {
    value: 0.5,
    label: '-0,5 kg a settimana',
    description: 'Deficit equilibrato, consigliato',
  },
  {
    value: 0.75,
    label: '-0,75 kg a settimana',
    description: 'Deficit sostenuto, richiede disciplina',
  },
  {
    value: 1,
    label: '-1 kg a settimana',
    description: 'Deficit aggressivo, breve periodo',
  },
];

// Coach mark engine: piccolo registry di hint progressivi.
// Ogni mark ha un id stabile (persistito in `app_settings.coach_marks_seen`)
// e un predicate puro. `pickNextMark` ritorna il PRIMO mark non visto la cui
// precondizione è vera, in ordine di registry.
//
// Aggiungere un nuovo mark = aggiungere un id alla union + una entry alla
// REGISTRY. Niente migration: i nuovi flag "seen=false" sono il default.
// I render sono in `components/CoachMarkHost.tsx` (switch su id) — il
// registry resta presentation-agnostic.

import type { AppMode, CoachMarksSeen } from '@/database';

export type CoachMarkId =
  | 'firstMeal'
  | 'rowActions'
  | 'mealAsFavorite'
  | 'usePreferiti'
  | 'sportMode'
  // Coach mark sport-side: vivono fuori dal CoachMarkHost (renderizzati
  // direttamente da WorkoutsScreen). Sono qui per type-safety quando
  // si chiama `markCoachMarkSeen` e per restare in un solo registro
  // persistito (`app_settings.coach_marks_seen`).
  | 'workoutsEquipmentIntro'
  | 'workoutsProgramsNews';

export type CoachMarkState = {
  totalMealsCount: number;
  todayMealsCount: number;
  favoritesCount: number;
  daysWithMealsCount: number;
};

export type CoachMarkContext = {
  appMode: AppMode;
  sportModeSeen: boolean;
};

export type CoachMark = {
  id: CoachMarkId;
  predicate: (state: CoachMarkState, ctx: CoachMarkContext) => boolean;
};

// Ordine = priorità. Step "rowActions" arriva subito dopo il primo pasto
// (mostra swipe→ + kebab/long-press). Step "mealAsFavorite" arriva quando
// l'utente ha più voci e potrebbe voler salvare un raggruppamento.
// "usePreferiti" guida al riuso dopo la prima creazione di preferito.
// "sportMode" chiude il giro come ultimo, solo dopo qualche giorno di uso.
export const COACH_MARKS: ReadonlyArray<CoachMark> = [
  {
    id: 'firstMeal',
    predicate: (s) => s.totalMealsCount === 0,
  },
  {
    id: 'rowActions',
    predicate: (s) => s.todayMealsCount >= 1,
  },
  {
    id: 'mealAsFavorite',
    predicate: (s) => s.todayMealsCount >= 2,
  },
  {
    id: 'usePreferiti',
    predicate: (s) => s.favoritesCount >= 1,
  },
  {
    id: 'sportMode',
    predicate: (s, ctx) => ctx.appMode === 'diet' && !ctx.sportModeSeen && s.daysWithMealsCount >= 3,
  },
];

export function pickNextMark(
  state: CoachMarkState,
  seen: CoachMarksSeen,
  ctx: CoachMarkContext,
): CoachMarkId | null {
  for (const mark of COACH_MARKS) {
    if (seen[mark.id]) continue;
    if (mark.predicate(state, ctx)) return mark.id;
  }
  return null;
}

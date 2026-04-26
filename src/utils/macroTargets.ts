// Split macro suggerito (proteine/carboidrati/grassi) ispirato a piani
// bilanciati di mantenimento o cut leggero. Non è un constraint hard:
// serve come riferimento visivo nella barra macro della Home.
//
// Conversione kcal → grammi via standard Atwater:
//   1 g proteine = 4 kcal
//   1 g carboidrati = 4 kcal
//   1 g grassi = 9 kcal
export const MACRO_SPLIT = {
  protein: 0.30,
  carbs: 0.45,
  fat: 0.25,
} as const;

const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

export type MacroTargets = {
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export function computeMacroTargets(targetKcal: number): MacroTargets {
  if (targetKcal <= 0) {
    return { proteinG: 0, carbsG: 0, fatG: 0 };
  }
  return {
    proteinG: Math.round((targetKcal * MACRO_SPLIT.protein) / KCAL_PER_G.protein),
    carbsG: Math.round((targetKcal * MACRO_SPLIT.carbs) / KCAL_PER_G.carbs),
    fatG: Math.round((targetKcal * MACRO_SPLIT.fat) / KCAL_PER_G.fat),
  };
}

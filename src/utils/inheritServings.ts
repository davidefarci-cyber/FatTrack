import { foodServingsDB, foodsDB } from '@/database';
import { findMatchingLocalFood } from '@/utils/foodMatcher';

// Quando creiamo un nuovo Food a partire da un prodotto OFF (search remoto o
// barcode) cerchiamo di ereditare porzioni utili dal seed locale (es. la
// "Banana" del seed con tutte le sue label "banana media"). Senza match
// usiamo il `serving_quantity` di OFF come singola porzione, se disponibile.
// Idempotente: gli INSERT sono protetti dall'UNIQUE su (food_id, lower(label))
// e i fallimenti sono silenziati per non bloccare il flusso di salvataggio.
export async function inheritServingsForRemoteFood(opts: {
  newFoodId: number;
  remoteName: string;
  offServingQuantity: number | null;
  offServingLabel?: string;
}): Promise<void> {
  try {
    const all = await foodsDB.listFoods(1000);
    const candidates = all.filter((f) => f.id !== opts.newFoodId);
    const match = findMatchingLocalFood(opts.remoteName, candidates);
    if (match) {
      const seedServings = await foodServingsDB.listServingsByFood(match.id);
      let pos = 0;
      for (const s of seedServings) {
        try {
          await foodServingsDB.createServing({
            foodId: opts.newFoodId,
            label: s.label,
            grams: s.grams,
            isDefault: s.isDefault && pos === 0,
            position: pos,
          });
        } catch {
          // duplicato: ignoriamo
        }
        pos += 1;
      }
      return;
    }
    if (opts.offServingQuantity != null && opts.offServingQuantity > 0) {
      try {
        await foodServingsDB.createServing({
          foodId: opts.newFoodId,
          label: opts.offServingLabel?.trim() || 'porzione',
          grams: opts.offServingQuantity,
          isDefault: true,
          position: 0,
        });
      } catch {
        // duplicato: ignoriamo
      }
    }
  } catch {
    // best-effort, non blocchiamo il caller
  }
}

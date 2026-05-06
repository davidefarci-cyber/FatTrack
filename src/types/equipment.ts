// Tag attrezzatura standardizzati. Usati in più posti:
// - `exercises.equipment_tags`: cosa serve per fare l'esercizio (più tag se
//   ha varianti equivalenti, es. squat = corpo libero o manubri).
// - `workouts.required_equipment`: union dei tag degli esercizi della scheda
//   (ridondante, ma evita N query per il filtro "schede eseguibili oggi").
// - `user_profile.available_equipment`: cosa l'utente possiede in casa.
// Persistiti come JSON array di stringhe in TEXT.

export type EquipmentTag =
  | 'corpo_libero'
  | 'manubri'
  | 'panca'
  | 'panca_inclinata'
  | 'elastico'
  | 'kettlebell'
  | 'bilanciere'
  | 'sbarra'
  | 'tapis_roulant'
  | 'ciclette'
  | 'sedia_o_panca';

export const EQUIPMENT_TAGS: readonly EquipmentTag[] = [
  'corpo_libero',
  'manubri',
  'panca',
  'panca_inclinata',
  'elastico',
  'kettlebell',
  'bilanciere',
  'sbarra',
  'tapis_roulant',
  'ciclette',
  'sedia_o_panca',
];

const TAG_SET = new Set<string>(EQUIPMENT_TAGS);

export function parseEquipmentTags(raw: string | null | undefined): EquipmentTag[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is EquipmentTag => typeof t === 'string' && TAG_SET.has(t));
  } catch {
    return [];
  }
}

export function serializeEquipmentTags(tags: EquipmentTag[] | null | undefined): string | null {
  if (!tags || tags.length === 0) return null;
  return JSON.stringify(tags);
}

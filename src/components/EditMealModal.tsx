import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { MEAL_INFO, MEAL_ORDER } from '@/components/mealMeta';
import { SegmentedControl } from '@/components/SegmentedControl';
import type { Meal, MealType } from '@/database';
import { foodServingsDB } from '@/database';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { calculateMealCalories } from '@/utils/calorieCalculator';

// Modal di modifica per un pasto già registrato.
// Consente di cambiare i grammi (o la porzione) e il tipo di pasto. Per i
// pasti a "costo fisso" (grams === 0, es. add-on rapidi) i grammi sono
// disabilitati: si può solo riassegnare a un altro slot.

type EditMealModalProps = {
  visible: boolean;
  meal: Meal | null;
  onClose: () => void;
  onSave: (input: {
    id: number;
    mealType: MealType;
    grams: number;
    caloriesTotal: number;
    servingLabel: string | null;
    servingQty: number | null;
    proteinTotal: number | null;
    carbsTotal: number | null;
    fatTotal: number | null;
  }) => Promise<void> | void;
};

const MEAL_OPTIONS: ReadonlyArray<{ value: MealType; label: string }> = MEAL_ORDER.map(
  (mealType) => ({ value: mealType, label: MEAL_INFO[mealType].label }),
);

const STEPPER_STEP = 0.5;

type ServingChoice = { label: string; grams: number };
type UnitKey = 'g' | `s${number}`;

export function EditMealModal({ visible, meal, onClose, onSave }: EditMealModalProps) {
  const insets = useSafeAreaInsets();
  const [qty, setQty] = useState('100');
  const [unit, setUnit] = useState<UnitKey>('g');
  const [mealType, setMealType] = useState<MealType>('pranzo');
  const [submitting, setSubmitting] = useState(false);
  const [servings, setServings] = useState<ServingChoice[]>([]);

  const isFixedCost = meal !== null && meal.grams === 0;

  // Carica le porzioni del food associato al pasto. Se il meal era stato
  // salvato con servingLabel ma quella porzione non esiste più (utente l'ha
  // eliminata), aggiungiamo una voce "snapshot" per non perdere il contesto.
  useEffect(() => {
    if (!visible || !meal || meal.foodId === null || isFixedCost) {
      setServings([]);
      return;
    }
    let active = true;
    foodServingsDB
      .listServingsByFood(meal.foodId)
      .then((rows) => {
        if (!active) return;
        const choices: ServingChoice[] = rows.map((r) => ({ label: r.label, grams: r.grams }));
        if (
          meal.servingLabel &&
          meal.servingQty &&
          meal.servingQty > 0 &&
          !choices.some((c) => c.label.toLowerCase() === meal.servingLabel!.toLowerCase())
        ) {
          const inferredGrams = meal.grams / meal.servingQty;
          choices.unshift({ label: meal.servingLabel, grams: inferredGrams });
        }
        setServings(choices);
      })
      .catch(() => {
        if (active) setServings([]);
      });
    return () => {
      active = false;
    };
  }, [visible, meal?.id, meal?.foodId, meal?.servingLabel, meal?.servingQty, isFixedCost]);

  // Allineiamo il form al pasto a ogni apertura. Cambiamo `meal?.id` in deps
  // per gestire l'apertura su pasti diversi senza chiusura intermedia.
  useEffect(() => {
    if (!visible || !meal) return;
    setMealType(meal.mealType);
    setSubmitting(false);
    if (meal.servingLabel && meal.servingQty && meal.servingQty > 0) {
      // L'unit specifica viene risolta dopo che `servings` è caricato
      // (effect successivo) — qui partiamo già con la quantità corretta.
      setQty(formatNumberInput(meal.servingQty));
    } else {
      setUnit('g');
      setQty(formatGramsInput(meal.grams));
    }
  }, [visible, meal?.id]);

  // Sincronizza l'unit con la lista servings appena caricata.
  useEffect(() => {
    if (!meal || !meal.servingLabel) return;
    const idx = servings.findIndex(
      (s) => s.label.toLowerCase() === meal.servingLabel!.toLowerCase(),
    );
    if (idx >= 0) setUnit(`s${idx}` as UnitKey);
  }, [servings, meal?.servingLabel]);

  const caloriesPer100g = useMemo(() => {
    if (!meal || meal.grams <= 0) return 0;
    return (meal.caloriesTotal / meal.grams) * 100;
  }, [meal]);

  const qtyNum = useMemo(() => {
    if (isFixedCost) return 0;
    const n = Number(String(qty).replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [qty, isFixedCost]);

  const activeServing = useMemo(() => {
    if (unit === 'g') return null;
    const idx = Number(unit.slice(1));
    return servings[idx] ?? null;
  }, [unit, servings]);

  const computedGrams = useMemo(() => {
    if (isFixedCost) return 0;
    if (qtyNum === null) return null;
    if (unit === 'g') return qtyNum;
    if (!activeServing) return null;
    return qtyNum * activeServing.grams;
  }, [qtyNum, unit, activeServing, isFixedCost]);

  const previewKcal = useMemo(() => {
    if (!meal) return null;
    if (isFixedCost) return Math.round(meal.caloriesTotal);
    if (computedGrams === null) return null;
    return Math.round(calculateMealCalories(caloriesPer100g, computedGrams));
  }, [meal, isFixedCost, computedGrams, caloriesPer100g]);

  // Macro proporzionali ai grammi correnti. Se lo snapshot del pasto era
  // null (legacy o manuale senza macro), restano null. Se era valorizzato,
  // scaliamo linearmente: ratio = newGrams / originalGrams.
  const scaledMacros = useMemo(() => {
    if (!meal || isFixedCost) return null;
    const hasAny =
      meal.proteinTotal !== null ||
      meal.carbsTotal !== null ||
      meal.fatTotal !== null;
    if (!hasAny) return null;
    const finalGrams = computedGrams ?? meal.grams;
    const ratio = meal.grams > 0 ? finalGrams / meal.grams : 1;
    const scale = (v: number | null) =>
      v === null ? null : Math.round(v * ratio * 10) / 10;
    return {
      protein: scale(meal.proteinTotal),
      carbs: scale(meal.carbsTotal),
      fat: scale(meal.fatTotal),
    };
  }, [meal, isFixedCost, computedGrams]);

  const unitOptions = useMemo<ReadonlyArray<{ value: UnitKey; label: string }>>(() => {
    const opts: { value: UnitKey; label: string }[] = [{ value: 'g', label: 'g' }];
    servings.forEach((s, i) => opts.push({ value: `s${i}` as UnitKey, label: s.label }));
    return opts;
  }, [servings]);

  const showServingSelector = !isFixedCost && servings.length > 0;
  const showStepper = !isFixedCost && unit !== 'g';

  const canSubmit = (() => {
    if (!meal || submitting) return false;
    if (isFixedCost) return mealType !== meal.mealType;
    if (computedGrams === null) return false;
    return hasChanges(
      meal,
      mealType,
      computedGrams,
      activeServing?.label ?? null,
      activeServing && qtyNum !== null ? qtyNum : null,
    );
  })();

  function adjustQty(delta: number) {
    const current = qtyNum ?? 0;
    const next = Math.max(0, Math.round((current + delta) * 100) / 100);
    setQty(formatNumberInput(next));
  }

  async function handleSubmit() {
    if (!meal) return;
    const finalGrams = isFixedCost ? meal.grams : computedGrams;
    if (finalGrams === null) return;
    const finalCalories = isFixedCost
      ? meal.caloriesTotal
      : calculateMealCalories(caloriesPer100g, finalGrams);
    // Per i pasti a costo fisso (add-on) i macro restano com'erano nello
    // snapshot — di norma null. Per i pasti normali ricalcoliamo dai
    // valori scalati ai grammi correnti.
    const finalMacros = isFixedCost
      ? {
          protein: meal.proteinTotal,
          carbs: meal.carbsTotal,
          fat: meal.fatTotal,
        }
      : scaledMacros ?? { protein: null, carbs: null, fat: null };
    setSubmitting(true);
    try {
      await onSave({
        id: meal.id,
        mealType,
        grams: finalGrams,
        caloriesTotal: finalCalories,
        servingLabel: activeServing?.label ?? null,
        servingQty: activeServing && qtyNum !== null ? qtyNum : null,
        proteinTotal: finalMacros.protein,
        carbsTotal: finalMacros.carbs,
        fatTotal: finalMacros.fat,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const headerInfo = MEAL_INFO[mealType];
  const unitSuffix = activeServing
    ? qtyNum !== null && qtyNum !== 1
      ? pluralize(activeServing.label)
      : activeServing.label
    : 'g';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            shadows.md,
            { paddingBottom: insets.bottom + spacing.screen },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={typography.label}>Modifica pasto</Text>
              <Text style={[typography.h1, { color: headerInfo.color }]}>
                {headerInfo.label}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chiudi"
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={8}
            >
              <Icon name="close" size={16} color={colors.textSec} />
            </Pressable>
          </View>

          {meal ? (
            <>
              <View style={styles.foodCard}>
                <Text style={typography.body} numberOfLines={2}>
                  {meal.foodName}
                </Text>
                <Text style={typography.caption}>
                  {isFixedCost
                    ? `${Math.round(meal.caloriesTotal)} kcal · costo fisso`
                    : `${Math.round(caloriesPer100g)} kcal / 100 g`}
                </Text>
                {scaledMacros ? (
                  <Text style={typography.caption}>
                    Macro: {formatMacroValue(scaledMacros.protein)} g P · {formatMacroValue(scaledMacros.carbs)} g C · {formatMacroValue(scaledMacros.fat)} g G
                  </Text>
                ) : null}
              </View>

              <View style={styles.section}>
                <Text style={typography.label}>Sposta a</Text>
                <SegmentedControl
                  options={MEAL_OPTIONS}
                  value={mealType}
                  onChange={setMealType}
                />
              </View>

              {showServingSelector ? (
                <SegmentedControl
                  options={unitOptions}
                  value={unit}
                  onChange={setUnit}
                />
              ) : null}

              <View style={styles.row}>
                <View style={styles.gramsField}>
                  <Text style={typography.label}>Quantità</Text>
                  <View
                    style={[
                      styles.gramsInputWrap,
                      isFixedCost && styles.gramsInputDisabled,
                    ]}
                  >
                    {showStepper ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Diminuisci"
                        onPress={() => adjustQty(-STEPPER_STEP)}
                        style={styles.stepperBtn}
                        hitSlop={6}
                      >
                        <Text style={styles.stepperLabel}>−</Text>
                      </Pressable>
                    ) : null}
                    <TextInput
                      value={isFixedCost ? '—' : qty}
                      onChangeText={setQty}
                      keyboardType="decimal-pad"
                      editable={!isFixedCost}
                      style={[styles.gramsInput, showStepper && styles.gramsInputCentered]}
                    />
                    {showStepper ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Aumenta"
                        onPress={() => adjustQty(STEPPER_STEP)}
                        style={styles.stepperBtn}
                        hitSlop={6}
                      >
                        <Text style={styles.stepperLabel}>+</Text>
                      </Pressable>
                    ) : null}
                    <Text style={[typography.caption, styles.gramsUnit]}>
                      {isFixedCost ? '' : unitSuffix}
                    </Text>
                  </View>
                  {showStepper && computedGrams !== null ? (
                    <Text style={typography.caption}>
                      ≈ {Math.round(computedGrams)} g
                    </Text>
                  ) : null}
                </View>
                <View style={styles.previewBox}>
                  <Text style={typography.label}>Totale</Text>
                  <Text style={typography.value}>
                    {previewKcal !== null ? `${previewKcal} kcal` : '—'}
                  </Text>
                </View>
              </View>

              <Button
                label="Salva modifiche"
                onPress={handleSubmit}
                disabled={!canSubmit}
                loading={submitting}
              />
            </>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function formatMacroValue(v: number | null): string {
  if (v === null) return '—';
  return Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ',');
}

function formatGramsInput(grams: number): string {
  if (grams === 0) return '';
  return Number.isInteger(grams) ? String(grams) : grams.toFixed(1);
}

function formatNumberInput(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

function pluralize(label: string): string {
  const trimmed = label.trim();
  const lower = trimmed.toLowerCase();
  if (lower.endsWith('o')) return trimmed.slice(0, -1) + 'i';
  if (lower.endsWith('a')) return trimmed.slice(0, -1) + 'e';
  if (lower.endsWith('e')) return trimmed.slice(0, -1) + 'i';
  return trimmed;
}

function hasChanges(
  meal: Meal,
  nextMealType: MealType,
  nextGrams: number,
  nextServingLabel: string | null,
  nextServingQty: number | null,
): boolean {
  if (nextMealType !== meal.mealType) return true;
  if (Math.abs(nextGrams - meal.grams) > 0.01) return true;
  if ((meal.servingLabel ?? null) !== (nextServingLabel ?? null)) return true;
  if ((meal.servingQty ?? null) !== (nextServingQty ?? null)) return true;
  return false;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.screen,
    gap: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    gap: spacing.xxs,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.round,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodCard: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing.xl,
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  section: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xl,
    alignItems: 'stretch',
  },
  gramsField: {
    flex: 1,
    gap: spacing.xs,
  },
  gramsInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  gramsInputDisabled: {
    opacity: 0.6,
  },
  gramsInput: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    fontSize: 14,
    color: colors.text,
    fontFamily: typography.body.fontFamily,
  },
  gramsInputCentered: {
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.card,
  },
  stepperLabel: {
    ...typography.value,
    color: colors.text,
  },
  gramsUnit: {
    paddingHorizontal: spacing.xl,
  },
  previewBox: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
});

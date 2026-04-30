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
import { MEAL_INFO } from '@/components/mealMeta';
import { SegmentedControl } from '@/components/SegmentedControl';
import type { MealType } from '@/database';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { calculateMealCalories } from '@/utils/calorieCalculator';

// Bottom-sheet riutilizzabile: l'alimento è già scelto (ricerca o scansione),
// qui raccogliamo grammi (o numero di porzioni alternative come "1 cucchiaino")
// e calcoliamo le calorie totali prima di confermare l'inserimento nel diario.

export type ServingOption = {
  label: string;
  grams: number;
  isDefault?: boolean;
};

export type GramsInputTarget = {
  foodName: string;
  caloriesPer100g: number;
  // Informazioni opzionali mostrate in header.
  subtitle?: string;
  // Porzioni alternative ("fetta", "cucchiaino"...). Quando assente o vuoto
  // il modal cade sull'input grammi puro (back-compat).
  servings?: ServingOption[];
};

export type GramsInputResult = {
  grams: number;
  caloriesTotal: number;
  servingLabel: string | null;
  servingQty: number | null;
};

type GramsInputModalProps = {
  visible: boolean;
  target: GramsInputTarget | null;
  mealType: MealType;
  onClose: () => void;
  onConfirm: (result: GramsInputResult) => Promise<void> | void;
  initialGrams?: string;
  confirmLabel?: string;
  // Quando settata, mostra un link "Aggiungi porzione personalizzata" sotto il
  // selettore unità. Il caller è responsabile di aprire l'editor (e, per food
  // OFF, di persistere il food prima così l'editor ha un foodId valido).
  onRequestAddServing?: () => void;
};

type UnitKey = 'g' | `s${number}`;

const STEPPER_STEP = 0.5;

export function GramsInputModal({
  visible,
  target,
  mealType,
  onClose,
  onConfirm,
  initialGrams = '100',
  confirmLabel = 'Aggiungi al diario',
  onRequestAddServing,
}: GramsInputModalProps) {
  const insets = useSafeAreaInsets();
  const servings = target?.servings ?? [];
  const hasServings = servings.length > 0;

  const defaultUnit: UnitKey = useMemo(() => {
    if (!hasServings) return 'g';
    const idx = servings.findIndex((s) => s.isDefault);
    return (`s${idx >= 0 ? idx : 0}` as UnitKey);
  }, [hasServings, servings]);

  const [unit, setUnit] = useState<UnitKey>(defaultUnit);
  const [qty, setQty] = useState<string>(hasServings ? '1' : initialGrams);
  const [submitting, setSubmitting] = useState(false);

  // Reset di unità e quantità a ogni riapertura / cambio target.
  useEffect(() => {
    if (!visible) return;
    setUnit(defaultUnit);
    setQty(defaultUnit === 'g' ? initialGrams : '1');
  }, [visible, target?.foodName, defaultUnit, initialGrams]);

  const qtyNum = useMemo(() => {
    const n = Number(String(qty).replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [qty]);

  const activeServing: ServingOption | null = useMemo(() => {
    if (unit === 'g') return null;
    const idx = Number(unit.slice(1));
    return servings[idx] ?? null;
  }, [unit, servings]);

  const grams = useMemo(() => {
    if (qtyNum === null) return null;
    if (unit === 'g') return qtyNum;
    if (!activeServing) return null;
    return qtyNum * activeServing.grams;
  }, [qtyNum, unit, activeServing]);

  const preview = useMemo(() => {
    if (!target || grams === null) return null;
    return Math.round(calculateMealCalories(target.caloriesPer100g, grams));
  }, [target, grams]);

  const canSubmit = target !== null && grams !== null && !submitting;
  const mealInfo = MEAL_INFO[mealType];

  const unitOptions = useMemo<ReadonlyArray<{ value: UnitKey; label: string }>>(() => {
    const opts: { value: UnitKey; label: string }[] = [{ value: 'g', label: 'g' }];
    servings.forEach((s, i) => {
      opts.push({ value: `s${i}` as UnitKey, label: s.label });
    });
    return opts;
  }, [servings]);

  function adjustQty(delta: number) {
    const current = qtyNum ?? 0;
    const next = Math.max(0, Math.round((current + delta) * 100) / 100);
    setQty(formatQty(next));
  }

  async function handleSubmit() {
    if (!target || grams === null) return;
    setSubmitting(true);
    try {
      await onConfirm({
        grams,
        caloriesTotal: calculateMealCalories(target.caloriesPer100g, grams),
        servingLabel: activeServing?.label ?? null,
        servingQty: activeServing && qtyNum !== null ? qtyNum : null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const showStepper = unit !== 'g';
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
              <Text style={typography.label}>Conferma alimento</Text>
              <Text style={[typography.h1, { color: mealInfo.color }]}>
                {mealInfo.label}
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

          {target ? (
            <>
              <View style={styles.foodCard}>
                <Text style={typography.body} numberOfLines={2}>
                  {target.foodName}
                </Text>
                <Text style={typography.caption}>
                  {target.subtitle
                    ? `${target.subtitle} · `
                    : ''}
                  {target.caloriesPer100g} kcal / 100 g
                </Text>
              </View>

              {hasServings ? (
                <SegmentedControl
                  options={unitOptions}
                  value={unit}
                  onChange={setUnit}
                />
              ) : null}

              {onRequestAddServing ? (
                <Pressable
                  onPress={onRequestAddServing}
                  style={styles.addServingBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Aggiungi porzione personalizzata"
                >
                  <Icon name="plus" size={12} color={colors.blue} />
                  <Text style={[typography.bodyBold, styles.addServingText]}>
                    {hasServings
                      ? 'Aggiungi porzione personalizzata'
                      : 'Aggiungi una porzione (es. 1 fetta = 30 g)'}
                  </Text>
                </Pressable>
              ) : null}

              <View style={styles.row}>
                <View style={styles.gramsField}>
                  <Text style={typography.label}>Quantità</Text>
                  <View style={styles.gramsInputWrap}>
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
                      value={qty}
                      onChangeText={setQty}
                      keyboardType="decimal-pad"
                      style={[styles.gramsInput, showStepper && styles.gramsInputStepper]}
                      autoFocus
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
                    <Text style={[typography.caption, styles.unitSuffix]}>
                      {unitSuffix}
                    </Text>
                  </View>
                  {showStepper && grams !== null ? (
                    <Text style={typography.caption}>
                      ≈ {Math.round(grams)} g
                    </Text>
                  ) : null}
                </View>
                <View style={styles.previewBox}>
                  <Text style={typography.label}>Totale</Text>
                  <Text style={typography.value}>
                    {preview !== null ? `${preview} kcal` : '—'}
                  </Text>
                </View>
              </View>

              <Button
                label={confirmLabel}
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

function formatQty(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

// Pluralizzazione minimale italiana per le porzioni più comuni: cucchiaino,
// cucchiaio, fetta, mela, banana... La regola copre la maggior parte dei
// label seedati; per casi edge ricade sul singolare.
function pluralize(label: string): string {
  const trimmed = label.trim();
  const lower = trimmed.toLowerCase();
  if (lower.endsWith('o')) return trimmed.slice(0, -1) + 'i';
  if (lower.endsWith('a')) return trimmed.slice(0, -1) + 'e';
  if (lower.endsWith('e')) return trimmed.slice(0, -1) + 'i';
  return trimmed;
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
  gramsInput: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    fontSize: 14,
    color: colors.text,
    fontFamily: typography.body.fontFamily,
  },
  gramsInputStepper: {
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
  unitSuffix: {
    paddingHorizontal: spacing.xl,
  },
  previewBox: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  addServingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.blueLight,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.blue,
  },
  addServingText: {
    color: colors.blue,
  },
});

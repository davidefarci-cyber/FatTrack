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
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { calculateMealCalories } from '@/utils/calorieCalculator';

// Modal di modifica per un pasto già registrato.
// Consente di cambiare i grammi e il tipo di pasto. Per i pasti a "costo
// fisso" (grams === 0, es. Contorno aggiunto via preferito) i grammi sono
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
  }) => Promise<void> | void;
};

const MEAL_OPTIONS: ReadonlyArray<{ value: MealType; label: string }> = MEAL_ORDER.map(
  (mealType) => ({ value: mealType, label: MEAL_INFO[mealType].label }),
);

export function EditMealModal({ visible, meal, onClose, onSave }: EditMealModalProps) {
  const insets = useSafeAreaInsets();
  const [grams, setGrams] = useState('100');
  const [mealType, setMealType] = useState<MealType>('pranzo');
  const [submitting, setSubmitting] = useState(false);

  const isFixedCost = meal !== null && meal.grams === 0;

  // Allineiamo il form al pasto a ogni apertura. Cambiamo `meal?.id` in deps
  // per gestire l'apertura su pasti diversi senza chiusura intermedia.
  useEffect(() => {
    if (!visible || !meal) return;
    setGrams(formatGramsInput(meal.grams));
    setMealType(meal.mealType);
    setSubmitting(false);
  }, [visible, meal?.id]);

  const caloriesPer100g = useMemo(() => {
    if (!meal || meal.grams <= 0) return 0;
    return (meal.caloriesTotal / meal.grams) * 100;
  }, [meal]);

  const gramsNum = useMemo(() => {
    if (isFixedCost) return 0;
    const n = Number(String(grams).replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [grams, isFixedCost]);

  const previewKcal = useMemo(() => {
    if (!meal) return null;
    if (isFixedCost) return Math.round(meal.caloriesTotal);
    if (gramsNum === null) return null;
    return Math.round(calculateMealCalories(caloriesPer100g, gramsNum));
  }, [meal, isFixedCost, gramsNum, caloriesPer100g]);

  const canSubmit =
    meal !== null &&
    !submitting &&
    (isFixedCost || gramsNum !== null) &&
    hasChanges(meal, mealType, gramsNum);

  async function handleSubmit() {
    if (!meal) return;
    const finalGrams = isFixedCost ? meal.grams : gramsNum;
    if (finalGrams === null) return;
    const finalCalories = isFixedCost
      ? meal.caloriesTotal
      : calculateMealCalories(caloriesPer100g, finalGrams);
    setSubmitting(true);
    try {
      await onSave({
        id: meal.id,
        mealType,
        grams: finalGrams,
        caloriesTotal: finalCalories,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const headerInfo = MEAL_INFO[mealType];

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
              </View>

              <View style={styles.section}>
                <Text style={typography.label}>Sposta a</Text>
                <SegmentedControl
                  options={MEAL_OPTIONS}
                  value={mealType}
                  onChange={setMealType}
                />
              </View>

              <View style={styles.row}>
                <View style={styles.gramsField}>
                  <Text style={typography.label}>Quantità</Text>
                  <View
                    style={[
                      styles.gramsInputWrap,
                      isFixedCost && styles.gramsInputDisabled,
                    ]}
                  >
                    <TextInput
                      value={isFixedCost ? '—' : grams}
                      onChangeText={setGrams}
                      keyboardType="decimal-pad"
                      editable={!isFixedCost}
                      style={styles.gramsInput}
                    />
                    <Text style={[typography.caption, styles.gramsUnit]}>g</Text>
                  </View>
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

function formatGramsInput(grams: number): string {
  if (grams === 0) return '';
  return Number.isInteger(grams) ? String(grams) : grams.toFixed(1);
}

function hasChanges(
  meal: Meal,
  nextMealType: MealType,
  nextGrams: number | null,
): boolean {
  if (nextMealType !== meal.mealType) return true;
  if (nextGrams !== null && nextGrams !== meal.grams) return true;
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

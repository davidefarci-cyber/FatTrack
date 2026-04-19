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
import type { MealType } from '@/database';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { calculateMealCalories } from '@/utils/calorieCalculator';

// Bottom-sheet riutilizzabile: l'alimento è già scelto (ricerca o scansione),
// qui raccogliamo solo i grammi e calcoliamo le calorie totali prima di
// confermare l'inserimento nel diario.

export type GramsInputTarget = {
  foodName: string;
  caloriesPer100g: number;
  // Informazioni opzionali mostrate in header.
  subtitle?: string;
};

type GramsInputModalProps = {
  visible: boolean;
  target: GramsInputTarget | null;
  mealType: MealType;
  onClose: () => void;
  onConfirm: (result: { grams: number; caloriesTotal: number }) => Promise<void> | void;
  initialGrams?: string;
  confirmLabel?: string;
};

export function GramsInputModal({
  visible,
  target,
  mealType,
  onClose,
  onConfirm,
  initialGrams = '100',
  confirmLabel = 'Aggiungi al diario',
}: GramsInputModalProps) {
  const insets = useSafeAreaInsets();
  const [grams, setGrams] = useState(initialGrams);
  const [submitting, setSubmitting] = useState(false);

  // Reset dei grammi a ogni riapertura / cambio di target, così l'UI non
  // mantiene il valore dell'alimento precedente.
  useEffect(() => {
    if (visible) setGrams(initialGrams);
  }, [visible, target?.foodName, initialGrams]);

  const gramsNum = useMemo(() => {
    const n = Number(String(grams).replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [grams]);

  const preview = useMemo(() => {
    if (!target || gramsNum === null) return null;
    return Math.round(calculateMealCalories(target.caloriesPer100g, gramsNum));
  }, [target, gramsNum]);

  const canSubmit = target !== null && gramsNum !== null && !submitting;
  const mealInfo = MEAL_INFO[mealType];

  async function handleSubmit() {
    if (!target || gramsNum === null) return;
    setSubmitting(true);
    try {
      await onConfirm({
        grams: gramsNum,
        caloriesTotal: calculateMealCalories(target.caloriesPer100g, gramsNum),
      });
    } finally {
      setSubmitting(false);
    }
  }

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
                    ? `${target.subtitle} \u00b7 `
                    : ''}
                  {target.caloriesPer100g} kcal / 100 g
                </Text>
              </View>

              <View style={styles.row}>
                <View style={styles.gramsField}>
                  <Text style={typography.label}>Quantit\u00e0</Text>
                  <View style={styles.gramsInputWrap}>
                    <TextInput
                      value={grams}
                      onChangeText={setGrams}
                      keyboardType="decimal-pad"
                      style={styles.gramsInput}
                      autoFocus
                    />
                    <Text style={[typography.caption, { paddingHorizontal: spacing.xl }]}>
                      g
                    </Text>
                  </View>
                </View>
                <View style={styles.previewBox}>
                  <Text style={typography.label}>Totale</Text>
                  <Text style={typography.value}>
                    {preview !== null ? `${preview} kcal` : '\u2014'}
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
  previewBox: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
});

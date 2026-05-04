import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/Input';
import { MEAL_INFO } from '@/components/mealMeta';
import type { FavoriteItem, Meal, MealType, NewFavorite } from '@/database';
import { colors, radii, shadows, spacing, typography } from '@/theme';

// Modal compatto per salvare i pasti correnti come preferito riusabile.
// Richiamato dal cuore in header di MealSection (HomeScreen). Mostra una
// preview degli alimenti che verranno persistiti, un Input per il nome
// (precompilato con "{Pasto} del {dataLabel}") e conferma → createFavorite.

type Props = {
  visible: boolean;
  mealType: MealType;
  dateLabel: string;
  meals: ReadonlyArray<Meal>;
  onClose: () => void;
  onConfirm: (input: NewFavorite) => Promise<void>;
};

export function SaveMealAsFavoriteModal({
  visible,
  mealType,
  dateLabel,
  meals,
  onClose,
  onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const info = MEAL_INFO[mealType];
  const defaultName = useMemo(
    () => `${info.label} del ${dateLabel.toLowerCase()}`,
    [info.label, dateLabel],
  );
  const [name, setName] = useState(defaultName);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(defaultName);
    setSubmitting(false);
  }, [visible, defaultName]);

  const totalKcal = useMemo(
    () => Math.round(meals.reduce((sum, m) => sum + m.caloriesTotal, 0)),
    [meals],
  );

  const items = useMemo<FavoriteItem[]>(
    () =>
      meals.map((m) => ({
        foodId: m.foodId,
        foodName: m.foodName,
        grams: m.grams,
        calories: m.caloriesTotal,
        servingLabel: m.servingLabel,
        servingQty: m.servingQty,
        protein: m.proteinTotal,
        carbs: m.carbsTotal,
        fat: m.fatTotal,
      })),
    [meals],
  );

  const canConfirm = name.trim().length > 0 && items.length > 0 && !submitting;

  const handleConfirm = useCallback(async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    try {
      await onConfirm({ name: name.trim(), items });
    } finally {
      setSubmitting(false);
    }
  }, [canConfirm, name, items, onConfirm]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.card,
            shadows.md,
            { marginBottom: insets.bottom + spacing.screen },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={typography.label}>Salva come preferito</Text>
              <Text style={[typography.h1, { color: info.color }]}>
                {info.label}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Chiudi"
            >
              <Icon name="close" size={16} color={colors.textSec} />
            </Pressable>
          </View>

          <Text style={typography.caption}>
            Salviamo gli alimenti di questo pasto come preferito riusabile dal
            pulsante "Dai preferiti" di ogni pasto.
          </Text>

          <Input
            label="Nome del preferito"
            value={name}
            onChangeText={setName}
            autoCapitalize="sentences"
            placeholder="Es. Pranzo tipo lunedì"
          />

          <View style={styles.preview}>
            <Text style={typography.label}>Alimenti inclusi</Text>
            <ScrollView
              style={styles.previewList}
              contentContainerStyle={styles.previewListContent}
              showsVerticalScrollIndicator={false}
            >
              {items.map((it, idx) => (
                <View
                  key={`${it.foodId ?? 'side'}-${idx}`}
                  style={[
                    styles.previewRow,
                    idx < items.length - 1 && styles.previewRowDivider,
                  ]}
                >
                  <Text style={typography.body} numberOfLines={1}>
                    {it.foodName}
                  </Text>
                  <Text style={typography.caption}>
                    {Math.round(it.calories).toLocaleString('it-IT')} kcal
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.totalRow}>
            <Text style={typography.label}>Totale</Text>
            <Text style={typography.value}>
              {totalKcal.toLocaleString('it-IT')} kcal
            </Text>
          </View>

          <Button
            label="Crea preferito"
            onPress={handleConfirm}
            disabled={!canConfirm}
            loading={submitting}
          />
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
    paddingHorizontal: spacing.screen,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xxl,
    padding: spacing.screen,
    gap: spacing.xl,
    maxHeight: '90%',
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
  preview: {
    gap: spacing.md,
  },
  previewList: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    maxHeight: 180,
  },
  previewListContent: {
    paddingHorizontal: spacing.xl,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  previewRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
});

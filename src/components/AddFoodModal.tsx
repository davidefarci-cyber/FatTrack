import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { foodsDB } from '@/database';
import type { Food, MealType } from '@/database';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { calculateMealCalories } from '@/utils/calorieCalculator';

import { MEAL_INFO } from './mealMeta';

type AddFoodModalProps = {
  visible: boolean;
  mealType: MealType;
  onClose: () => void;
  onAdd: (input: {
    foodId: number | null;
    foodName: string;
    grams: number;
    caloriesTotal: number;
  }) => Promise<void> | void;
};

export function AddFoodModal({ visible, mealType, onClose, onAdd }: AddFoodModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState('100');
  const [submitting, setSubmitting] = useState(false);

  // Reset completo ogni volta che la modal viene riaperta: evita di
  // ricordare la ricerca precedente tra una sezione pasto e l'altra.
  useEffect(() => {
    if (visible) {
      setQuery('');
      setResults([]);
      setSelected(null);
      setGrams('100');
      foodsDB
        .listFoods(50)
        .then(setResults)
        .catch(() => setResults([]));
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setSearching(true);
    const run = query.trim().length === 0
      ? foodsDB.listFoods(50)
      : foodsDB.searchFoods(query.trim(), 50);
    run
      .then((rows) => {
        if (active) setResults(rows);
      })
      .catch(() => {
        if (active) setResults([]);
      })
      .finally(() => {
        if (active) setSearching(false);
      });
    return () => {
      active = false;
    };
  }, [query, visible]);

  const gramsNum = useMemo(() => {
    const n = Number(String(grams).replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [grams]);

  const preview = useMemo(() => {
    if (!selected || gramsNum === null) return null;
    return Math.round(calculateMealCalories(selected.caloriesPer100g, gramsNum));
  }, [selected, gramsNum]);

  const canSubmit = selected !== null && gramsNum !== null && !submitting;

  const handleSubmit = useCallback(async () => {
    if (!selected || gramsNum === null) return;
    setSubmitting(true);
    try {
      await onAdd({
        foodId: selected.id,
        foodName: selected.name,
        grams: gramsNum,
        caloriesTotal: calculateMealCalories(selected.caloriesPer100g, gramsNum),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }, [gramsNum, onAdd, onClose, selected]);

  const mealInfo = MEAL_INFO[mealType];

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
              <Text style={typography.label}>Aggiungi alimento</Text>
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

          <View style={styles.searchField}>
            <Icon name="search" size={16} color={colors.textSec} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Cerca alimento"
              placeholderTextColor={colors.textSec}
              style={styles.searchInput}
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>

          <View style={styles.resultsWrap}>
            {searching && results.length === 0 ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.textSec} />
              </View>
            ) : results.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={typography.caption}>Nessun alimento trovato</Text>
              </View>
            ) : (
              <FlatList
                data={results}
                keyExtractor={(item) => String(item.id)}
                keyboardShouldPersistTaps="handled"
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                renderItem={({ item }) => {
                  const isSelected = selected?.id === item.id;
                  return (
                    <Pressable
                      onPress={() => setSelected(item)}
                      style={[styles.row, isSelected && styles.rowSelected]}
                    >
                      <View style={styles.rowTextCol}>
                        <Text style={typography.body} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={typography.caption}>
                          {item.caloriesPer100g} kcal / 100 g
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.selector,
                          isSelected && styles.selectorActive,
                        ]}
                      >
                        {isSelected ? (
                          <Icon name="check" size={12} color={colors.card} />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                }}
              />
            )}
          </View>

          {selected ? (
            <View style={styles.footerBar}>
              <View style={styles.gramsRow}>
                <View style={styles.gramsField}>
                  <Text style={typography.label}>Quantit\u00e0</Text>
                  <View style={styles.gramsInputWrap}>
                    <TextInput
                      value={grams}
                      onChangeText={setGrams}
                      keyboardType="decimal-pad"
                      style={styles.gramsInput}
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
                label="Aggiungi al diario"
                onPress={handleSubmit}
                loading={submitting}
                disabled={!canSubmit}
              />
            </View>
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
    maxHeight: '86%',
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
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.lg,
    fontSize: 14,
    color: colors.text,
    fontFamily: typography.body.fontFamily,
  },
  resultsWrap: {
    minHeight: 160,
    maxHeight: 320,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.screen,
  },
  emptyBox: {
    padding: spacing.screen,
    alignItems: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  rowSelected: {
    backgroundColor: colors.greenLight,
  },
  rowTextCol: {
    flex: 1,
    gap: spacing.xxs,
  },
  selector: {
    width: 20,
    height: 20,
    borderRadius: radii.round,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  footerBar: {
    gap: spacing.xl,
  },
  gramsRow: {
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
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
});

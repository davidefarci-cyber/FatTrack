import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddFoodModal } from '@/components/AddFoodModal';
import { Card } from '@/components/Card';
import { FavoritesModal } from '@/components/FavoritesModal';
import { Icon } from '@/components/Icon';
import { MEAL_INFO, MEAL_ORDER } from '@/components/mealMeta';
import { ProgressBar } from '@/components/ProgressBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import type { Favorite, Meal, MealType } from '@/database';
import { useDailyLog } from '@/hooks/useDailyLog';
import type { NewMealInput } from '@/hooks/useDailyLog';
import { useProfile } from '@/hooks/useProfile';
import { colors, radii, shadows, spacing, typography } from '@/theme';

const FALLBACK_TARGET_KCAL = 2000;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { targetCalories } = useProfile();
  const {
    dateLabel,
    isToday,
    loading,
    mealsByType,
    totalCalories,
    addMeal,
    addMeals,
    removeMeal,
    goToPreviousDay,
    goToNextDay,
    goToToday,
  } = useDailyLog();

  const [addFoodMeal, setAddFoodMeal] = useState<MealType | null>(null);
  const [favoritesMeal, setFavoritesMeal] = useState<MealType | null>(null);

  const target = targetCalories ?? FALLBACK_TARGET_KCAL;
  const totalRounded = Math.round(totalCalories);
  const remaining = Math.round(target - totalCalories);
  const percent = target > 0 ? Math.round((totalCalories / target) * 100) : 0;
  const isOver = totalCalories > target && target > 0;

  const handleDelete = useCallback((id: number) => removeMeal(id), [removeMeal]);

  const handleAddFood = useCallback(
    async (
      mealType: MealType,
      input: Omit<NewMealInput, 'mealType'>,
    ) => {
      await addMeal({ ...input, mealType });
    },
    [addMeal],
  );

  const handleAddFavorite = useCallback(
    async (mealType: MealType, favorite: Favorite) => {
      const inputs: NewMealInput[] = favorite.items.map((item) => ({
        mealType,
        foodId: item.foodId,
        foodName: item.foodName,
        grams: item.grams,
        caloriesTotal: item.calories,
      }));
      if (inputs.length > 0) await addMeals(inputs);
    },
    [addMeals],
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Diario di oggi"
        subtitle="Pasti e calorie giornaliere"
        style={{ paddingTop: insets.top + spacing.xl }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.screen * 2 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <DayNavigator
          dateLabel={dateLabel}
          isToday={isToday}
          onPrev={goToPreviousDay}
          onNext={goToNextDay}
          onToday={goToToday}
        />

        <Card style={styles.summaryCard}>
          <Text style={typography.label}>Totale giornaliero</Text>
          <View style={styles.totalRow}>
            <Text style={[styles.totalNumber, isOver && { color: colors.red }]}>
              {totalRounded.toLocaleString('it-IT')}
            </Text>
            <Text style={styles.totalUnit}>kcal</Text>
          </View>
          <ProgressBar value={totalCalories} target={target} />
          <View style={styles.summaryFooter}>
            <Text style={typography.caption}>
              {totalRounded.toLocaleString('it-IT')} /{' '}
              {target.toLocaleString('it-IT')} kcal \u00b7 {percent}%
            </Text>
            <Text
              style={[
                typography.bodyBold,
                { color: isOver ? colors.red : colors.green },
              ]}
            >
              {isOver
                ? `${Math.abs(remaining).toLocaleString('it-IT')} kcal oltre`
                : `${remaining.toLocaleString('it-IT')} kcal rimanenti`}
            </Text>
          </View>
        </Card>

        {MEAL_ORDER.map((mealType) => (
          <MealSection
            key={mealType}
            mealType={mealType}
            meals={mealsByType[mealType]}
            loading={loading}
            onAdd={() => setAddFoodMeal(mealType)}
            onAddFavorite={() => setFavoritesMeal(mealType)}
            onDelete={handleDelete}
          />
        ))}
      </ScrollView>

      <AddFoodModal
        visible={addFoodMeal !== null}
        mealType={addFoodMeal ?? 'colazione'}
        onClose={() => setAddFoodMeal(null)}
        onAdd={(input) =>
          addFoodMeal ? handleAddFood(addFoodMeal, input) : Promise.resolve()
        }
      />
      <FavoritesModal
        visible={favoritesMeal !== null}
        mealType={favoritesMeal ?? 'colazione'}
        onClose={() => setFavoritesMeal(null)}
        onSelect={(fav) =>
          favoritesMeal ? handleAddFavorite(favoritesMeal, fav) : Promise.resolve()
        }
      />
    </View>
  );
}

function DayNavigator({
  dateLabel,
  isToday,
  onPrev,
  onNext,
  onToday,
}: {
  dateLabel: string;
  isToday: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <View style={styles.dayNav}>
      <Pressable onPress={onPrev} style={styles.dayNavArrow} hitSlop={8} accessibilityLabel="Giorno precedente">
        <Icon name="chevron-left" size={18} color={colors.text} />
      </Pressable>
      <Pressable onPress={onToday} style={styles.dayNavLabel} disabled={isToday}>
        <Text style={typography.bodyBold}>{dateLabel}</Text>
        {!isToday ? (
          <Text style={typography.caption}>Tocca per tornare a oggi</Text>
        ) : null}
      </Pressable>
      <Pressable onPress={onNext} style={styles.dayNavArrow} hitSlop={8} accessibilityLabel="Giorno successivo">
        <Icon name="chevron-right" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

function MealSection({
  mealType,
  meals,
  loading,
  onAdd,
  onAddFavorite,
  onDelete,
}: {
  mealType: MealType;
  meals: Meal[];
  loading: boolean;
  onAdd: () => void;
  onAddFavorite: () => void;
  onDelete: (id: number) => void;
}) {
  const info = MEAL_INFO[mealType];
  const subtotal = Math.round(
    meals.reduce((sum, m) => sum + m.caloriesTotal, 0),
  );

  return (
    <Card style={styles.mealCard}>
      <View style={styles.mealHeader}>
        <View style={styles.mealHeaderLeft}>
          <View style={[styles.mealDot, { backgroundColor: info.color }]} />
          <View>
            <Text style={[typography.body, { color: info.color }]}>
              {info.label}
            </Text>
            <Text style={typography.caption}>
              {meals.length === 0
                ? 'Nessun alimento'
                : `${subtotal.toLocaleString('it-IT')} kcal \u00b7 ${meals.length} ${
                    meals.length === 1 ? 'voce' : 'voci'
                  }`}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={onAdd}
          style={[styles.addBtn, { backgroundColor: info.bg }]}
          hitSlop={6}
          accessibilityLabel={`Aggiungi alimento a ${info.label}`}
        >
          <Icon name="plus" size={16} color={info.color} />
        </Pressable>
      </View>

      <View style={styles.mealList}>
        {loading && meals.length === 0 ? (
          <Text style={[typography.caption, styles.mealEmpty]}>
            Caricamento\u2026
          </Text>
        ) : meals.length === 0 ? (
          <Text style={[typography.caption, styles.mealEmpty]}>
            Aggiungi il tuo primo alimento per {info.label.toLowerCase()}.
          </Text>
        ) : (
          meals.map((meal, idx) => (
            <MealRow
              key={meal.id}
              meal={meal}
              onDelete={onDelete}
              isLast={idx === meals.length - 1}
            />
          ))
        )}
      </View>

      <Pressable
        onPress={onAddFavorite}
        style={styles.favoriteBtn}
        accessibilityRole="button"
      >
        <Icon name="star" size={14} color={info.color} />
        <Text style={[typography.bodyBold, { color: info.color }]}>
          Aggiungi da preferiti
        </Text>
      </Pressable>
    </Card>
  );
}

function MealRow({
  meal,
  onDelete,
  isLast,
}: {
  meal: Meal;
  onDelete: (id: number) => void;
  isLast: boolean;
}) {
  return (
    <Swipeable
      renderRightActions={() => (
        <Pressable
          onPress={() => onDelete(meal.id)}
          style={styles.deleteAction}
          accessibilityRole="button"
          accessibilityLabel={`Elimina ${meal.foodName}`}
        >
          <Icon name="trash" size={16} color={colors.card} />
          <Text style={[typography.bodyBold, { color: colors.card }]}>
            Elimina
          </Text>
        </Pressable>
      )}
      overshootRight={false}
    >
      <View
        style={[
          styles.mealRow,
          !isLast && styles.mealRowDivider,
        ]}
      >
        <View style={styles.mealRowText}>
          <Text style={typography.body} numberOfLines={1}>
            {meal.foodName}
          </Text>
          <Text style={typography.caption}>
            {formatGrams(meal.grams)} g
          </Text>
        </View>
        <Text style={typography.bodyBold}>
          {Math.round(meal.caloriesTotal).toLocaleString('it-IT')} kcal
        </Text>
      </View>
    </Swipeable>
  );
}

function formatGrams(grams: number): string {
  return Number.isInteger(grams) ? String(grams) : grams.toFixed(1);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    padding: spacing.screen,
    gap: spacing.screen,
  },
  dayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  dayNavArrow: {
    width: 32,
    height: 32,
    borderRadius: radii.round,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNavLabel: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  summaryCard: {
    padding: spacing.screen,
    gap: spacing.xl,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.md,
  },
  totalNumber: {
    ...typography.display,
    fontSize: 36,
    lineHeight: 40,
    color: colors.text,
  },
  totalUnit: {
    ...typography.bodyBold,
    color: colors.textSec,
  },
  summaryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealCard: {
    padding: spacing.screen,
    gap: spacing.xl,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  mealDot: {
    width: 10,
    height: 10,
    borderRadius: radii.round,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealList: {
    gap: 0,
  },
  mealEmpty: {
    paddingVertical: spacing.md,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xl,
    paddingVertical: spacing.xl,
    backgroundColor: colors.card,
  },
  mealRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mealRowText: {
    flex: 1,
    gap: spacing.xxs,
  },
  deleteAction: {
    width: 96,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    ...shadows.sm,
  },
  favoriteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
});

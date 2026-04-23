import { useCallback, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddFoodSheet } from '@/components/AddFoodSheet';
import { FavoritesModal } from '@/components/FavoritesModal';
import { HomeSummaryCard } from '@/components/HomeSummaryCard';
import { Icon } from '@/components/Icon';
import { MealSection } from '@/components/MealSection';
import { MEAL_ORDER } from '@/components/mealMeta';
import { ScreenHeader } from '@/components/ScreenHeader';
import type { Favorite, MealType } from '@/database';
import { useDailyLog } from '@/hooks/useDailyLog';
import type { NewMealInput } from '@/hooks/useDailyLog';
import { useProfile } from '@/hooks/useProfile';
import { colors, radii, spacing, typography } from '@/theme';

const FALLBACK_TARGET_KCAL = 2000;

// Abilita LayoutAnimation su Android (di default è off) per il collapse animato.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// HomeScreen: diario del giorno. Host del bottom-sheet AddFood e del modal
// dei preferiti. Non dipende più da un HomeStackNavigator: entrambe le
// interazioni sono gestite con state locale e renderizzate qui.
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { targetCalories } = useProfile();
  const {
    date,
    dateLabel,
    isToday,
    loading,
    mealsByType,
    totalCalories,
    addMeals,
    removeMeal,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    reload,
  } = useDailyLog();

  const [addFoodMeal, setAddFoodMeal] = useState<MealType | null>(null);
  const [favoritesMeal, setFavoritesMeal] = useState<MealType | null>(null);
  const [collapsed, setCollapsed] = useState<Record<MealType, boolean>>({
    colazione: false,
    pranzo: false,
    cena: false,
    spuntino: false,
  });

  const toggleCollapse = useCallback((mealType: MealType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsed((prev) => ({ ...prev, [mealType]: !prev[mealType] }));
  }, []);

  const target = targetCalories ?? FALLBACK_TARGET_KCAL;

  const handleDelete = useCallback((id: number) => removeMeal(id), [removeMeal]);

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

        <HomeSummaryCard consumed={totalCalories} target={target} />

        {MEAL_ORDER.map((mealType) => (
          <MealSection
            key={mealType}
            mealType={mealType}
            meals={mealsByType[mealType]}
            loading={loading}
            collapsed={collapsed[mealType]}
            onToggleCollapse={() => toggleCollapse(mealType)}
            onAdd={() => setAddFoodMeal(mealType)}
            onAddFavorite={() => setFavoritesMeal(mealType)}
            onDelete={handleDelete}
          />
        ))}
      </ScrollView>

      <AddFoodSheet
        visible={addFoodMeal !== null}
        mealType={addFoodMeal ?? 'colazione'}
        date={date}
        onClose={() => setAddFoodMeal(null)}
        onAdded={reload}
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
      <Pressable
        onPress={onPrev}
        style={styles.dayNavArrow}
        hitSlop={8}
        accessibilityLabel="Giorno precedente"
      >
        <Icon name="chevron-left" size={18} color={colors.text} />
      </Pressable>
      <Pressable
        onPress={onToday}
        style={styles.dayNavLabel}
        disabled={isToday}
      >
        <Text style={typography.bodyBold}>{dateLabel}</Text>
        {!isToday ? (
          <Text style={typography.caption}>Tocca per tornare a oggi</Text>
        ) : null}
      </Pressable>
      <Pressable
        onPress={onNext}
        style={styles.dayNavArrow}
        hitSlop={8}
        accessibilityLabel="Giorno successivo"
      >
        <Icon name="chevron-right" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
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
});

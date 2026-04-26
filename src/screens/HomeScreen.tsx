import { useCallback, useEffect, useState } from 'react';
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
import { EditMealModal } from '@/components/EditMealModal';
import { FavoritesModal } from '@/components/FavoritesModal';
import { HomeSummaryCard } from '@/components/HomeSummaryCard';
import { Icon } from '@/components/Icon';
import { MealSection } from '@/components/MealSection';
import { MEAL_ORDER } from '@/components/mealMeta';
import { ScreenHeader } from '@/components/ScreenHeader';
import { mealsStore, quickAddonsDB } from '@/database';
import type { Favorite, Meal, MealType, QuickAddon } from '@/database';
import { useDailyLog } from '@/hooks/useDailyLog';
import type { NewMealInput } from '@/hooks/useDailyLog';
import { useProfile } from '@/hooks/useProfile';
import { colors, radii, spacing, typography } from '@/theme';
import { DEFAULT_TARGET_KCAL } from '@/utils/calorieCalculator';
import { computeMacroTargets } from '@/utils/macroTargets';

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
    macros,
    addMeals,
    removeMeal,
    goToPreviousDay,
    goToNextDay,
    goToToday,
  } = useDailyLog();

  const [addFoodMeal, setAddFoodMeal] = useState<MealType | null>(null);
  const [favoritesMeal, setFavoritesMeal] = useState<MealType | null>(null);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [quickAddons, setQuickAddons] = useState<QuickAddon[]>([]);
  const [collapsed, setCollapsed] = useState<Record<MealType, boolean>>({
    colazione: false,
    pranzo: false,
    cena: false,
    spuntino: false,
  });

  // Carichiamo gli addon configurati in Settings: l'utente li userà come
  // scorciatoie nella riga azioni di ogni pasto. Ricarichiamo quando si chiude
  // il sheet di aggiunta cibo (mediato da addFoodMeal) per riflettere subito
  // eventuali modifiche da SettingsScreen senza dover ricaricare l'app.
  useEffect(() => {
    if (addFoodMeal !== null) return;
    quickAddonsDB.listAddons().then(setQuickAddons).catch(() => undefined);
  }, [addFoodMeal]);

  const toggleCollapse = useCallback((mealType: MealType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsed((prev) => ({ ...prev, [mealType]: !prev[mealType] }));
  }, []);

  const target = targetCalories ?? DEFAULT_TARGET_KCAL;
  const macroTargets = computeMacroTargets(target);

  const handleDelete = useCallback((id: number) => removeMeal(id), [removeMeal]);

  const handleEdit = useCallback((meal: Meal) => setEditingMeal(meal), []);

  const handleSaveEdit = useCallback(
    async (input: {
      id: number;
      mealType: MealType;
      grams: number;
      caloriesTotal: number;
      servingLabel: string | null;
      servingQty: number | null;
      proteinTotal: number | null;
      carbsTotal: number | null;
      fatTotal: number | null;
    }) => {
      await mealsStore.updateMeal(input.id, {
        mealType: input.mealType,
        grams: input.grams,
        caloriesTotal: input.caloriesTotal,
        servingLabel: input.servingLabel,
        servingQty: input.servingQty,
        proteinTotal: input.proteinTotal,
        carbsTotal: input.carbsTotal,
        fatTotal: input.fatTotal,
      });
      setEditingMeal(null);
    },
    [],
  );

  const handleAddFavorite = useCallback(
    async (mealType: MealType, favorite: Favorite) => {
      const inputs: NewMealInput[] = favorite.items.map((item) => ({
        mealType,
        foodId: item.foodId,
        foodName: item.foodName,
        grams: item.grams,
        caloriesTotal: item.calories,
        servingLabel: item.servingLabel ?? null,
        servingQty: item.servingQty ?? null,
        proteinTotal: item.protein ?? null,
        carbsTotal: item.carbs ?? null,
        fatTotal: item.fat ?? null,
      }));
      if (inputs.length > 0) await addMeals(inputs);
    },
    [addMeals],
  );

  const handleAddAddon = useCallback(
    async (mealType: MealType, addon: QuickAddon) => {
      await addMeals([
        {
          mealType,
          foodId: null,
          foodName: addon.label,
          grams: 0,
          caloriesTotal: addon.calories,
          servingLabel: null,
          servingQty: null,
        },
      ]);
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

        <HomeSummaryCard
          consumed={totalCalories}
          target={target}
          macrosConsumed={macros}
          macroTargets={macroTargets}
        />

        {MEAL_ORDER.map((mealType) => (
          <MealSection
            key={mealType}
            mealType={mealType}
            meals={mealsByType[mealType]}
            loading={loading}
            collapsed={collapsed[mealType]}
            quickAddons={quickAddons}
            onToggleCollapse={() => toggleCollapse(mealType)}
            onAdd={() => setAddFoodMeal(mealType)}
            onAddFavorite={() => setFavoritesMeal(mealType)}
            onAddAddon={(addon) => handleAddAddon(mealType, addon)}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        ))}
      </ScrollView>

      <AddFoodSheet
        visible={addFoodMeal !== null}
        mealType={addFoodMeal ?? 'colazione'}
        date={date}
        onClose={() => setAddFoodMeal(null)}
      />

      <FavoritesModal
        visible={favoritesMeal !== null}
        mealType={favoritesMeal ?? 'colazione'}
        onClose={() => setFavoritesMeal(null)}
        onSelect={(fav) =>
          favoritesMeal ? handleAddFavorite(favoritesMeal, fav) : Promise.resolve()
        }
      />

      <EditMealModal
        visible={editingMeal !== null}
        meal={editingMeal}
        onClose={() => setEditingMeal(null)}
        onSave={handleSaveEdit}
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

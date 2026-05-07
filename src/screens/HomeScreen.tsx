import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddFoodSheet } from '@/components/AddFoodSheet';
import { CoachMarkHost } from '@/components/CoachMarkHost';
import { EditMealModal } from '@/components/EditMealModal';
import { FavoritesModal } from '@/components/FavoritesModal';
import { HeaderActions } from '@/components/HeaderActions';
import { HomeSummaryCard } from '@/components/HomeSummaryCard';
import { Icon } from '@/components/Icon';
import { MealSection } from '@/components/MealSection';
import { MEAL_ORDER } from '@/components/mealMeta';
import { SaveAsQuickAddonModal } from '@/components/SaveAsQuickAddonModal';
import { SaveMealAsFavoriteModal } from '@/components/SaveMealAsFavoriteModal';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useToast } from '@/components/Toast';
import { favoritesDB, mealsStore, quickAddonsDB } from '@/database';
import type { Favorite, Meal, MealType, QuickAddon } from '@/database';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useCoachMarks } from '@/hooks/useCoachMarks';
import { useDailyLog } from '@/hooks/useDailyLog';
import type { NewMealInput } from '@/hooks/useDailyLog';
import { useProfile } from '@/hooks/useProfile';
import { colors, radii, spacing, typography } from '@/theme';
import { DEFAULT_TARGET_KCAL } from '@/utils/calorieCalculator';
import { lightHaptic } from '@/utils/haptics';
import { computeMacroTargets } from '@/utils/macroTargets';

// Abilita LayoutAnimation su Android (di default è off) per il collapse animato.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// HomeScreen: diario del giorno. Host del bottom-sheet AddFood, dei modal
// di preferiti / save-as-favorite / save-as-quick-addon e del banner
// del coach mark corrente. Le interazioni delle righe (edit/elimina/quick
// addon) sono gestite tramite props da MealSection: il modal corrispondente
// si apre qui sopra.
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { targetCalories } = useProfile();
  const { setAppMode, markSportModeSeen } = useAppSettings();
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

  const todayMealsCount = useMemo(
    () =>
      mealsByType.colazione.length +
      mealsByType.pranzo.length +
      mealsByType.cena.length +
      mealsByType.spuntino.length,
    [mealsByType],
  );
  const coachMarks = useCoachMarks({ todayMealsCount });

  const [addFoodMeal, setAddFoodMeal] = useState<MealType | null>(null);
  const [favoritesMeal, setFavoritesMeal] = useState<MealType | null>(null);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [saveAsFavoriteMeal, setSaveAsFavoriteMeal] = useState<MealType | null>(
    null,
  );
  const [saveAsQuickAddonMeal, setSaveAsQuickAddonMeal] = useState<Meal | null>(
    null,
  );
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
  // Idem alla chiusura del modal di salva-come-aggiunta-rapida.
  useEffect(() => {
    if (addFoodMeal !== null) return;
    if (saveAsQuickAddonMeal !== null) return;
    quickAddonsDB.listAddons().then(setQuickAddons).catch(() => undefined);
  }, [addFoodMeal, saveAsQuickAddonMeal]);

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
      if (inputs.length > 0) {
        await addMeals(inputs);
        void lightHaptic();
      }
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
      void lightHaptic();
    },
    [addMeals],
  );

  const handleConfirmSaveAsFavorite = useCallback(
    async (input: { name: string; items: Favorite['items'] }) => {
      await favoritesDB.createFavorite({ name: input.name, items: input.items });
      setSaveAsFavoriteMeal(null);
      coachMarks.refresh();
      toast.show('Preferito creato');
      void lightHaptic();
    },
    [coachMarks, toast],
  );

  const handleConfirmSaveAsQuickAddon = useCallback(
    async (input: { label: string; calories: number }) => {
      await quickAddonsDB.createAddon(input);
      setSaveAsQuickAddonMeal(null);
      // Il useEffect su quickAddons si aggiorna alla chiusura del modal
      // (saveAsQuickAddonMeal !== null → null), che ricarica la lista da DB.
      toast.show('Aggiunta rapida creata');
      void lightHaptic();
    },
    [toast],
  );

  // Swipe orizzontale per cambio giorno: stessa semantica delle frecce
  // nel DayNavigator (chevron-left → giorno precedente, quindi swipe
  // verso destra = `goToPreviousDay`). `activeOffsetX` ritarda l'attivazione
  // a 15px orizzontali e `failOffsetY` cede subito allo scroll verticale
  // se il gesto vira sopra i 25px in Y. Threshold di fine gesto: 60px di
  // translation + 200 di velocity per evitare cambi giorno accidentali.
  const swipeDayGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-15, 15])
        .failOffsetY([-25, 25])
        .onEnd((e) => {
          const dx = e.translationX;
          const vx = Math.abs(e.velocityX);
          if (vx < 200) return;
          if (dx > 60) goToPreviousDay();
          else if (dx < -60) goToNextDay();
        }),
    [goToPreviousDay, goToNextDay],
  );

  const saveAsFavoriteMeals = saveAsFavoriteMeal
    ? mealsByType[saveAsFavoriteMeal]
    : [];

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Diario di oggi"
        subtitle="Pasti e calorie giornaliere"
        style={{ paddingTop: insets.top + spacing.xl }}
        right={<HeaderActions />}
      />

      <GestureDetector gesture={swipeDayGesture}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + spacing.screen * 2 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <CoachMarkHost
            currentId={coachMarks.currentId}
            onDismiss={(id) => {
              void coachMarks.dismiss(id);
            }}
            onSwitchToSport={async () => {
              await setAppMode('sport');
              await markSportModeSeen();
            }}
          />

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
              bouncePeek={coachMarks.currentId === 'rowActions'}
              onToggleCollapse={() => toggleCollapse(mealType)}
              onAdd={() => setAddFoodMeal(mealType)}
              onAddFavorite={() => setFavoritesMeal(mealType)}
              onAddAddon={(addon) => handleAddAddon(mealType, addon)}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onSaveMealAsFavorite={() => setSaveAsFavoriteMeal(mealType)}
              onSaveRowAsQuickAddon={(meal) => setSaveAsQuickAddonMeal(meal)}
            />
          ))}
        </ScrollView>
      </GestureDetector>

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

      <SaveMealAsFavoriteModal
        visible={saveAsFavoriteMeal !== null}
        mealType={saveAsFavoriteMeal ?? 'colazione'}
        dateLabel={dateLabel}
        meals={saveAsFavoriteMeals}
        onClose={() => setSaveAsFavoriteMeal(null)}
        onConfirm={handleConfirmSaveAsFavorite}
      />

      <SaveAsQuickAddonModal
        visible={saveAsQuickAddonMeal !== null}
        defaultLabel={saveAsQuickAddonMeal?.foodName ?? ''}
        defaultCalories={saveAsQuickAddonMeal?.caloriesTotal ?? 0}
        onClose={() => setSaveAsQuickAddonMeal(null)}
        onConfirm={handleConfirmSaveAsQuickAddon}
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

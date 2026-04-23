import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { GramsInputModal } from '@/components/GramsInputModal';
import type { GramsInputTarget } from '@/components/GramsInputModal';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/Input';
import { MEAL_INFO, MEAL_ORDER } from '@/components/mealMeta';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useToast } from '@/components/Toast';
import { foodsDB, settingsDB } from '@/database';
import type { Favorite, FavoriteItem, Food, MealType } from '@/database';
import { useFavorites } from '@/hooks/useFavorites';
import { todayISO } from '@/hooks/useDailyLog';
import { colors, radii, shadows, spacing, typography } from '@/theme';

const SIDE_DISH_LABEL = 'Contorno';

const MEAL_OPTIONS: ReadonlyArray<{ value: MealType; label: string }> = MEAL_ORDER.map(
  (mealType) => ({ value: mealType, label: MEAL_INFO[mealType].label }),
);

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const {
    favorites,
    loading,
    createFavorite,
    updateFavorite,
    deleteFavorite,
    addToDay,
  } = useFavorites();

  const [targetMeal, setTargetMeal] = useState<MealType>('pranzo');
  const [editing, setEditing] = useState<Favorite | 'new' | null>(null);
  const [sideDishCalories, setSideDishCalories] = useState<number>(50);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  // Leggiamo le calorie fisse "contorno" dalle impostazioni: il valore è
  // configurato dall'utente in SettingsScreen e usato qui come costo fisso
  // per la voce "Contorno" nei preferiti.
  useEffect(() => {
    settingsDB
      .getSettings()
      .then((s) => setSideDishCalories(s.sideDishCalories))
      .catch(() => undefined);
  }, [editing]);

  const handleAddToToday = useCallback(
    async (favorite: Favorite) => {
      if (favorite.items.length === 0) return;
      setSubmittingId(favorite.id);
      try {
        await addToDay(favorite, targetMeal, todayISO());
        toast.show('Aggiunto!');
      } finally {
        setSubmittingId(null);
      }
    },
    [addToDay, targetMeal, toast],
  );

  const handleSave = useCallback(
    async (name: string, items: FavoriteItem[]) => {
      if (editing === 'new' || editing === null) {
        await createFavorite({ name, items });
      } else {
        await updateFavorite(editing.id, { name, items });
      }
    },
    [editing, createFavorite, updateFavorite],
  );

  const targetInfo = MEAL_INFO[targetMeal];

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Preferiti"
        subtitle="I tuoi pasti salvati, pronti da riusare"
        style={{ paddingTop: insets.top + spacing.xl }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.screen * 4 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.selectorCard}>
          <Text style={typography.label}>Aggiungi al pasto</Text>
          <SegmentedControl
            options={MEAL_OPTIONS}
            value={targetMeal}
            onChange={setTargetMeal}
          />
          <Text style={typography.caption}>
            Tocca un preferito per aggiungerlo a {targetInfo.label.toLowerCase()} di oggi.
          </Text>
        </Card>

        {loading ? (
          <Card style={styles.placeholderCard}>
            <ActivityIndicator color={colors.textSec} />
          </Card>
        ) : favorites.length === 0 ? (
          <Card style={styles.placeholderCard}>
            <Text style={typography.body}>Nessun preferito ancora</Text>
            <Text style={typography.caption}>
              Usa il pulsante + per creare il tuo primo pasto preferito.
            </Text>
          </Card>
        ) : (
          favorites.map((favorite) => (
            <FavoriteRow
              key={favorite.id}
              favorite={favorite}
              accentColor={targetInfo.color}
              accentBg={targetInfo.bg}
              submitting={submittingId === favorite.id}
              disabled={submittingId !== null && submittingId !== favorite.id}
              onAdd={() => handleAddToToday(favorite)}
              onEdit={() => setEditing(favorite)}
              onDelete={() => deleteFavorite(favorite.id)}
            />
          ))
        )}
      </ScrollView>

      <Pressable
        onPress={() => setEditing('new')}
        style={[
          styles.fab,
          { bottom: insets.bottom + spacing.xxl * 2 },
          shadows.md,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Crea nuovo preferito"
      >
        <Icon name="plus" size={20} color={colors.card} />
      </Pressable>

      <FavoriteEditorModal
        visible={editing !== null}
        editing={editing === 'new' ? null : editing}
        sideDishCalories={sideDishCalories}
        onClose={() => setEditing(null)}
        onSave={handleSave}
      />
    </View>
  );
}

// -----------------------------------------------------------------------------
// Riga preferito: swipe-left per eliminare, tap per aggiungere al diario,
// icona matita per modificare.
// -----------------------------------------------------------------------------

type FavoriteRowProps = {
  favorite: Favorite;
  accentColor: string;
  accentBg: string;
  submitting: boolean;
  disabled: boolean;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

function FavoriteRow({
  favorite,
  accentColor,
  accentBg,
  submitting,
  disabled,
  onAdd,
  onEdit,
  onDelete,
}: FavoriteRowProps) {
  const totalKcal = Math.round(
    favorite.items.reduce((sum, item) => sum + item.calories, 0),
  );

  return (
    <Swipeable
      renderRightActions={() => (
        <Pressable
          onPress={onDelete}
          style={styles.deleteAction}
          accessibilityRole="button"
          accessibilityLabel={`Elimina ${favorite.name}`}
        >
          <Icon name="trash" size={16} color={colors.card} />
          <Text style={[typography.bodyBold, { color: colors.card }]}>Elimina</Text>
        </Pressable>
      )}
      overshootRight={false}
    >
      <Card
        style={[
          styles.favoriteCard,
          (submitting || disabled) && styles.favoriteCardMuted,
        ]}
      >
        <Pressable
          onPress={onAdd}
          disabled={disabled || submitting}
          style={styles.favoriteBody}
          accessibilityRole="button"
          accessibilityLabel={`Aggiungi ${favorite.name} al diario`}
        >
          <View style={styles.favoriteText}>
            <Text style={typography.body} numberOfLines={1}>
              {favorite.name}
            </Text>
            <Text style={typography.caption} numberOfLines={1}>
              {favorite.items.length}{' '}
              {favorite.items.length === 1 ? 'alimento' : 'alimenti'} {'\u00b7'}{' '}
              {totalKcal.toLocaleString('it-IT')} kcal
            </Text>
          </View>
          <View style={[styles.favoriteChip, { backgroundColor: accentBg }]}>
            {submitting ? (
              <ActivityIndicator color={accentColor} />
            ) : (
              <Text style={[typography.bodyBold, { color: accentColor }]}>
                Aggiungi
              </Text>
            )}
          </View>
        </Pressable>
        <Pressable
          onPress={onEdit}
          disabled={disabled || submitting}
          style={styles.favoriteEditBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Modifica ${favorite.name}`}
        >
          <Icon name="pencil" size={16} color={colors.textSec} />
        </Pressable>
      </Card>
    </Swipeable>
  );
}

// -----------------------------------------------------------------------------
// Editor modal: creazione / modifica di un pasto preferito.
// Sheet a schermo pieno che ricicla GramsInputModal per raccogliere i grammi
// dopo aver scelto un alimento dalla ricerca locale.
// -----------------------------------------------------------------------------

type FavoriteEditorModalProps = {
  visible: boolean;
  editing: Favorite | null;
  sideDishCalories: number;
  onClose: () => void;
  onSave: (name: string, items: FavoriteItem[]) => Promise<void>;
};

const FOOD_SEARCH_DEBOUNCE_MS = 250;

function FavoriteEditorModal({
  visible,
  editing,
  sideDishCalories,
  onClose,
  onSave,
}: FavoriteEditorModalProps) {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [pendingFood, setPendingFood] = useState<Food | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset del form a ogni riapertura. La dipendenza da editing?.id distingue
  // tra modifica di preferiti diversi; quando si chiude/riapre la modal
  // azzeriamo comunque la ricerca.
  useEffect(() => {
    if (!visible) return;
    setName(editing?.name ?? '');
    setItems(editing?.items ?? []);
    setQuery('');
    setResults([]);
    setPendingFood(null);
  }, [visible, editing?.id]);

  // Ricerca locale: debounced per non martellare SQLite a ogni carattere.
  useEffect(() => {
    if (!visible) return;
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setResults([]);
      return;
    }
    let active = true;
    const handle = setTimeout(() => {
      foodsDB
        .searchFoods(trimmed, 20)
        .then((rows) => {
          if (active) setResults(rows);
        })
        .catch(() => {
          if (active) setResults([]);
        });
    }, FOOD_SEARCH_DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [query, visible]);

  const totalKcal = useMemo(
    () => Math.round(items.reduce((sum, it) => sum + it.calories, 0)),
    [items],
  );

  const canSave = name.trim().length > 0 && items.length > 0 && !saving;

  const handleAddFood = useCallback(
    ({ grams, caloriesTotal }: { grams: number; caloriesTotal: number }) => {
      if (!pendingFood) return;
      setItems((prev) => [
        ...prev,
        {
          foodId: pendingFood.id,
          foodName: pendingFood.name,
          grams,
          calories: caloriesTotal,
        },
      ]);
      setPendingFood(null);
      setQuery('');
      setResults([]);
    },
    [pendingFood],
  );

  const handleAddSideDish = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        foodId: null,
        foodName: SIDE_DISH_LABEL,
        grams: 0,
        calories: sideDishCalories,
      },
    ]);
  }, [sideDishCalories]);

  const handleRemoveItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed || items.length === 0) return;
    setSaving(true);
    try {
      await onSave(trimmed, items);
      onClose();
    } finally {
      setSaving(false);
    }
  }, [name, items, onSave, onClose]);

  const pendingTarget: GramsInputTarget | null = pendingFood
    ? {
        foodName: pendingFood.name,
        caloriesPer100g: pendingFood.caloriesPer100g,
        subtitle: `${pendingFood.caloriesPer100g} kcal / 100 g`,
      }
    : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.editorRoot}
      >
        <Pressable style={styles.editorBackdrop} onPress={onClose} />
        <View
          style={[
            styles.editorSheet,
            shadows.md,
            {
              paddingBottom: insets.bottom + spacing.screen,
              paddingTop: insets.top + spacing.xl,
            },
          ]}
        >
          <View style={styles.editorHeader}>
            <View style={styles.editorHeaderText}>
              <Text style={typography.label}>
                {editing ? 'Modifica preferito' : 'Nuovo preferito'}
              </Text>
              <Text style={typography.h1}>
                {editing ? editing.name : 'Crea un pasto'}
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

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.editorScroll}
            showsVerticalScrollIndicator={false}
          >
            <Input
              label="Nome del pasto"
              value={name}
              onChangeText={setName}
              placeholder="Es. Pranzo tipo luned\u00ec"
              autoCapitalize="sentences"
            />

            <View style={styles.editorSection}>
              <Text style={typography.label}>Alimenti</Text>
              {items.length === 0 ? (
                <Text style={[typography.caption, styles.editorHint]}>
                  Aggiungi gli alimenti che compongono il pasto.
                </Text>
              ) : (
                <View style={styles.itemsList}>
                  {items.map((item, idx) => (
                    <View
                      key={`${item.foodId ?? 'side'}-${idx}`}
                      style={[
                        styles.itemRow,
                        idx < items.length - 1 && styles.itemRowDivider,
                      ]}
                    >
                      <View style={styles.itemText}>
                        <Text style={typography.body} numberOfLines={1}>
                          {item.foodName}
                        </Text>
                        <Text style={typography.caption}>
                          {item.foodId === null
                            ? 'Costo fisso'
                            : `${formatGrams(item.grams)} g`}
                          {' \u00b7 '}
                          {Math.round(item.calories).toLocaleString('it-IT')} kcal
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleRemoveItem(idx)}
                        style={styles.itemRemove}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Rimuovi ${item.foodName}`}
                      >
                        <Icon name="trash" size={14} color={colors.red} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <Pressable
                onPress={handleAddSideDish}
                style={styles.sideDishBtn}
                accessibilityRole="button"
              >
                <Icon name="plus" size={14} color={colors.green} />
                <Text style={[typography.bodyBold, { color: colors.green }]}>
                  Aggiungi contorno ({sideDishCalories} kcal)
                </Text>
              </Pressable>
            </View>

            <View style={styles.editorSection}>
              <Text style={typography.label}>Cerca alimento</Text>
              <View style={styles.searchField}>
                <Icon name="search" size={16} color={colors.textSec} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Cerca nel database"
                  placeholderTextColor={colors.textSec}
                  style={styles.searchInput}
                  autoCorrect={false}
                  returnKeyType="search"
                />
              </View>

              {query.trim().length > 0 && results.length === 0 ? (
                <Text style={[typography.caption, styles.editorHint]}>
                  Nessun alimento trovato.
                </Text>
              ) : results.length > 0 ? (
                <FlatList
                  data={results}
                  keyExtractor={(food) => String(food.id)}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.resultSeparator} />}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => setPendingFood(item)}
                      style={styles.resultRow}
                      accessibilityRole="button"
                      accessibilityLabel={`Aggiungi ${item.name}`}
                    >
                      <View style={styles.resultText}>
                        <Text style={typography.body} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={typography.caption} numberOfLines={1}>
                          {item.caloriesPer100g} kcal / 100 g
                        </Text>
                      </View>
                      <Icon name="plus" size={14} color={colors.textSec} />
                    </Pressable>
                  )}
                />
              ) : null}
            </View>

            <View style={styles.totalsCard}>
              <Text style={typography.label}>Totale pasto</Text>
              <Text style={typography.value}>
                {totalKcal.toLocaleString('it-IT')} kcal
              </Text>
            </View>
          </ScrollView>

          <View style={styles.editorFooter}>
            <Button
              label={editing ? 'Salva modifiche' : 'Crea preferito'}
              onPress={handleSave}
              disabled={!canSave}
              loading={saving}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      <GramsInputModal
        visible={pendingFood !== null}
        target={pendingTarget}
        // Il meal-type qui serve solo a dare colore all'header del modal:
        // nel contesto "composizione preferito" non c'è un meal reale.
        mealType="pranzo"
        onClose={() => setPendingFood(null)}
        onConfirm={handleAddFood}
        confirmLabel="Aggiungi al pasto"
      />
    </Modal>
  );
}

function formatGrams(grams: number): string {
  return Number.isInteger(grams) ? String(grams) : grams.toFixed(1);
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    padding: spacing.screen,
    gap: spacing.screen,
  },
  selectorCard: {
    padding: spacing.screen,
    gap: spacing.xl,
  },
  placeholderCard: {
    padding: spacing.screen,
    gap: spacing.sm,
    alignItems: 'center',
  },
  favoriteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.xl,
  },
  favoriteCardMuted: {
    opacity: 0.6,
  },
  favoriteBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  favoriteText: {
    flex: 1,
    gap: spacing.xxs,
  },
  favoriteChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.round,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteEditBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.round,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAction: {
    width: 96,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    ...shadows.sm,
  },
  fab: {
    position: 'absolute',
    right: spacing.screen,
    width: 56,
    height: 56,
    borderRadius: radii.round,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Editor modal
  editorRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  editorBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  editorSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: spacing.screen,
    maxHeight: '95%',
    gap: spacing.xl,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  editorHeaderText: {
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
  editorScroll: {
    gap: spacing.xl,
    paddingBottom: spacing.xl,
  },
  editorSection: {
    gap: spacing.md,
  },
  editorHint: {
    paddingVertical: spacing.sm,
  },
  itemsList: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.xl,
  },
  itemRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemText: {
    flex: 1,
    gap: spacing.xxs,
  },
  itemRemove: {
    width: 32,
    height: 32,
    borderRadius: radii.round,
    backgroundColor: colors.redLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideDishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.greenLight,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.green,
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
  resultSeparator: {
    height: spacing.xs,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  resultText: {
    flex: 1,
    gap: spacing.xxs,
  },
  totalsCard: {
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
  editorFooter: {
    gap: spacing.md,
  },
});

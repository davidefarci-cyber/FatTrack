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
import { FAB } from '@/components/FAB';
import { GramsInputModal } from '@/components/GramsInputModal';
import type { GramsInputTarget, ServingOption } from '@/components/GramsInputModal';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/Input';
import { MEAL_INFO, MEAL_ORDER } from '@/components/mealMeta';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useToast } from '@/components/Toast';
import { foodServingsDB, foodsDB, quickAddonsDB } from '@/database';
import type { Favorite, FavoriteItem, Food, MealType, QuickAddon } from '@/database';
import { useFavorites } from '@/hooks/useFavorites';
import { todayISO } from '@/hooks/useDailyLog';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { scaleMacro } from '@/utils/calorieCalculator';

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
  const [quickAddons, setQuickAddons] = useState<QuickAddon[]>([]);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  // Carichiamo gli addon configurati in Settings: l'utente li userà come
  // scorciatoie per aggiungere calorie fisse al preferito (contorno, olio,
  // condimento, ecc.).
  useEffect(() => {
    quickAddonsDB
      .listAddons()
      .then(setQuickAddons)
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

      <FAB
        icon="plus"
        onPress={() => setEditing('new')}
        color={colors.purple}
        bottom={insets.bottom + spacing.xxl * 2}
        accessibilityLabel="Crea nuovo preferito"
      />

      <FavoriteEditorModal
        visible={editing !== null}
        editing={editing === 'new' ? null : editing}
        quickAddons={quickAddons}
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
          <View style={styles.favoriteBadge}>
            <Icon name="heart" size={20} color={colors.purple} />
          </View>
          <View style={styles.favoriteText}>
            <Text style={typography.body} numberOfLines={1}>
              {favorite.name}
            </Text>
            <Text style={typography.caption} numberOfLines={1}>
              {favorite.items.length === 0
                ? 'Pasto vuoto'
                : `${favorite.items.length} ${favorite.items.length === 1 ? 'alimento' : 'alimenti'} \u00b7 ${totalKcal.toLocaleString('it-IT')} kcal`}
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
  quickAddons: QuickAddon[];
  onClose: () => void;
  onSave: (name: string, items: FavoriteItem[]) => Promise<void>;
};

const FOOD_SEARCH_DEBOUNCE_MS = 250;

function FavoriteEditorModal({
  visible,
  editing,
  quickAddons,
  onClose,
  onSave,
}: FavoriteEditorModalProps) {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [pendingFood, setPendingFood] = useState<Food | null>(null);
  const [pendingServings, setPendingServings] = useState<ServingOption[]>([]);
  const [saving, setSaving] = useState(false);
  // Modal per creare un alimento nuovo al volo: viene salvato in foodsDB
  // (source='manual') così la prossima ricerca lo troverà senza dover
  // passare da AddFoodSheet.
  const [manualOpen, setManualOpen] = useState(false);
  const [manualPrefillName, setManualPrefillName] = useState('');

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
    setPendingServings([]);
    setManualOpen(false);
    setManualPrefillName('');
  }, [visible, editing?.id]);

  // Quando si seleziona un alimento per aggiungerlo al preferito, carichiamo
  // le sue porzioni alternative per il GramsInputModal (stesso pattern di
  // AddFoodSheet).
  useEffect(() => {
    if (!pendingFood) {
      setPendingServings([]);
      return;
    }
    let active = true;
    foodServingsDB
      .listServingsByFood(pendingFood.id)
      .then((rows) => {
        if (!active) return;
        setPendingServings(
          rows.map((r) => ({ label: r.label, grams: r.grams, isDefault: r.isDefault })),
        );
      })
      .catch(() => {
        if (active) setPendingServings([]);
      });
    return () => {
      active = false;
    };
  }, [pendingFood]);

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
    ({
      grams,
      caloriesTotal,
      servingLabel,
      servingQty,
    }: {
      grams: number;
      caloriesTotal: number;
      servingLabel: string | null;
      servingQty: number | null;
    }) => {
      if (!pendingFood) return;
      setItems((prev) => [
        ...prev,
        {
          foodId: pendingFood.id,
          foodName: pendingFood.name,
          grams,
          calories: caloriesTotal,
          servingLabel,
          servingQty,
          protein: scaleMacro(pendingFood.proteinPer100g, grams),
          carbs: scaleMacro(pendingFood.carbsPer100g, grams),
          fat: scaleMacro(pendingFood.fatPer100g, grams),
        },
      ]);
      setPendingFood(null);
      setQuery('');
      setResults([]);
    },
    [pendingFood],
  );

  const handleAddAddon = useCallback((addon: QuickAddon) => {
    setItems((prev) => [
      ...prev,
      {
        foodId: null,
        foodName: addon.label,
        grams: 0,
        calories: addon.calories,
      },
    ]);
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleCreateManualFood = useCallback(
    async (input: { name: string; caloriesPer100g: number; grams: number }) => {
      const trimmed = input.name.trim();
      if (!trimmed) return;
      // Se esiste già un alimento con lo stesso nome, riusiamo quello:
      // non duplichiamo e aggiorniamo il riferimento per futuri re-usi.
      const existing = await foodsDB.findByName(trimmed);
      const food =
        existing ??
        (await foodsDB.createFood({
          name: trimmed,
          caloriesPer100g: input.caloriesPer100g,
          source: 'manual',
        }));
      const calories = (food.caloriesPer100g * input.grams) / 100;
      setItems((prev) => [
        ...prev,
        {
          foodId: food.id,
          foodName: food.name,
          grams: input.grams,
          calories,
          protein: scaleMacro(food.proteinPer100g, input.grams),
          carbs: scaleMacro(food.carbsPer100g, input.grams),
          fat: scaleMacro(food.fatPer100g, input.grams),
        },
      ]);
      setManualOpen(false);
      setManualPrefillName('');
      setQuery('');
      setResults([]);
    },
    [],
  );

  const openManualWithName = useCallback((prefill: string) => {
    setManualPrefillName(prefill.trim());
    setManualOpen(true);
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
        servings: pendingServings,
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

              {quickAddons.length > 0 ? (
                <View style={styles.addonsRow}>
                  {quickAddons.map((addon) => (
                    <Pressable
                      key={addon.id}
                      onPress={() => handleAddAddon(addon)}
                      style={styles.addonChip}
                      accessibilityRole="button"
                      accessibilityLabel={`Aggiungi ${addon.label}`}
                    >
                      <Icon name="plus" size={12} color={colors.green} />
                      <Text style={[typography.bodyBold, { color: colors.green }]}>
                        {addon.label}
                      </Text>
                      <Text style={[typography.caption, { color: colors.green }]}>
                        {Math.round(addon.calories)} kcal
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
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
                <Pressable
                  onPress={() => openManualWithName(query)}
                  style={styles.manualEmptyBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Aggiungi alimento manualmente"
                >
                  <Text style={typography.caption}>
                    Nessun alimento trovato.
                  </Text>
                  <Text style={[typography.bodyBold, { color: colors.green }]}>
                    + Aggiungilo manualmente
                  </Text>
                </Pressable>
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

              <Pressable
                onPress={() => openManualWithName('')}
                style={styles.manualAddBtn}
                accessibilityRole="button"
                accessibilityLabel="Aggiungi alimento manualmente"
              >
                <Icon name="plus" size={14} color={colors.blue} />
                <Text style={[typography.bodyBold, { color: colors.blue }]}>
                  Nuovo alimento manuale
                </Text>
              </Pressable>
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

      <ManualFoodEntryModal
        visible={manualOpen}
        initialName={manualPrefillName}
        onClose={() => setManualOpen(false)}
        onConfirm={handleCreateManualFood}
      />
    </Modal>
  );
}

// -----------------------------------------------------------------------------
// ManualFoodEntryModal: nuovo alimento creato al volo dall'editor preferiti.
// Persiste in foodsDB con source='manual' così diventa ricercabile per sempre.
// -----------------------------------------------------------------------------

type ManualFoodEntryModalProps = {
  visible: boolean;
  initialName: string;
  onClose: () => void;
  onConfirm: (input: { name: string; caloriesPer100g: number; grams: number }) => Promise<void>;
};

function ManualFoodEntryModal({
  visible,
  initialName,
  onClose,
  onConfirm,
}: ManualFoodEntryModalProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(initialName);
  const [kcalText, setKcalText] = useState('');
  const [gramsText, setGramsText] = useState('100');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(initialName);
    setKcalText('');
    setGramsText('100');
    setSubmitting(false);
  }, [visible, initialName]);

  const kcal = parseNumber(kcalText);
  const grams = parseNumber(gramsText);
  const total =
    kcal !== null && grams !== null ? Math.round((kcal * grams) / 100) : null;
  const canConfirm =
    name.trim().length > 0 && kcal !== null && kcal > 0 && grams !== null && grams > 0;

  const handleConfirm = useCallback(async () => {
    if (!canConfirm || kcal === null || grams === null) return;
    setSubmitting(true);
    try {
      await onConfirm({ name: name.trim(), caloriesPer100g: kcal, grams });
    } finally {
      setSubmitting(false);
    }
  }, [canConfirm, kcal, grams, name, onConfirm]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.manualRoot}
      >
        <Pressable style={styles.editorBackdrop} onPress={onClose} />
        <View
          style={[
            styles.manualCard,
            shadows.md,
            { marginBottom: insets.bottom + spacing.screen },
          ]}
        >
          <View style={styles.editorHeader}>
            <View style={styles.editorHeaderText}>
              <Text style={typography.label}>Nuovo alimento</Text>
              <Text style={typography.h1}>Aggiungi manualmente</Text>
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
            Lo salviamo in archivio: la prossima volta lo trovi con la ricerca.
          </Text>

          <Input
            label="Nome alimento"
            value={name}
            onChangeText={setName}
            autoCapitalize="sentences"
            placeholder="Es. Pasta integrale"
          />
          <Input
            label="Calorie per 100 g"
            unit="kcal"
            keyboardType="decimal-pad"
            value={kcalText}
            onChangeText={setKcalText}
            placeholder="120"
          />
          <Input
            label="Quantità"
            unit="g"
            keyboardType="decimal-pad"
            value={gramsText}
            onChangeText={setGramsText}
          />

          <View style={styles.totalsCard}>
            <Text style={typography.label}>Totale</Text>
            <Text style={typography.value}>
              {total !== null ? `${total.toLocaleString('it-IT')} kcal` : '—'}
            </Text>
          </View>

          <Button
            label="Aggiungi al pasto"
            onPress={handleConfirm}
            disabled={!canConfirm}
            loading={submitting}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function parseNumber(raw: string): number | null {
  const n = Number(String(raw).replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
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
  favoriteBadge: {
    width: 44,
    height: 44,
    borderRadius: radii.round,
    backgroundColor: colors.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
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
  addonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  addonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.greenLight,
    borderRadius: radii.round,
    borderWidth: 1.5,
    borderColor: colors.green,
  },
  manualAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.blueLight,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.blue,
  },
  manualEmptyBtn: {
    gap: spacing.xxs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  manualRoot: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.screen,
  },
  manualCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xxl,
    padding: spacing.screen,
    gap: spacing.xl,
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

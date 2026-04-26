import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { FoodServingsEditorModal } from '@/components/FoodServingsEditorModal';
import { GramsInputModal } from '@/components/GramsInputModal';
import type { GramsInputTarget, ServingOption } from '@/components/GramsInputModal';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/Input';
import { MEAL_INFO } from '@/components/mealMeta';
import { ScannerView } from '@/components/ScannerView';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useToast } from '@/components/Toast';
import { foodsDB, foodServingsDB, mealsStore } from '@/database';
import type { Food, FoodSource, MealType } from '@/database';
import { colors, radii, spacing, typography } from '@/theme';
import { calculateMealCalories, scaleMacro } from '@/utils/calorieCalculator';
import { offByBarcode, offSearch } from '@/utils/openFoodFacts';
import type { OffProduct } from '@/utils/openFoodFacts';

// Bottom-sheet per l'aggiunta di un alimento al diario.
// Ospita 3 tab (Cerca / Barcode / Manuale) riutilizzando i componenti
// condivisi: `SegmentedControl`, `ScannerView` (variante compact),
// `GramsInputModal` e `Input`. La persistenza passa sempre da
// `mealsStore.createMeal`; a conferma il sheet si chiude e mostra un toast.

type AddFoodSheetProps = {
  visible: boolean;
  mealType: MealType;
  date: string;
  onClose: () => void;
  onAdded?: () => void;
};

type TabKey = 'search' | 'barcode' | 'manual';

const TAB_OPTIONS: ReadonlyArray<{ value: TabKey; label: string }> = [
  { value: 'search', label: 'Cerca' },
  { value: 'barcode', label: 'Barcode' },
  { value: 'manual', label: 'Manuale' },
];

const SEARCH_DEBOUNCE_MS = 400;

export function AddFoodSheet({ visible, mealType, date, onClose, onAdded }: AddFoodSheetProps) {
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>('search');
  const info = MEAL_INFO[mealType];

  // Reset tab alla riapertura così l'utente parte sempre dalla ricerca.
  useEffect(() => {
    if (visible) setTab('search');
  }, [visible]);

  const commitMeal = useCallback(
    async (args: {
      foodName: string;
      caloriesPer100g: number;
      grams: number;
      caloriesTotal: number;
      servingLabel: string | null;
      servingQty: number | null;
      source: FoodSource;
      existingFoodId?: number | null;
      // Macro per 100 g (null quando non disponibili: food legacy, OFF
      // senza dati nutrizionali, manuale senza campi macro). Vengono
      // sia persistiti su `foods` se creiamo un nuovo record, sia scalati
      // in snapshot per il `meal`.
      proteinPer100g?: number | null;
      carbsPer100g?: number | null;
      fatPer100g?: number | null;
      // Porzione tipica letta da OFF: la persistiamo come food_serving così
      // la prossima volta che l'utente sceglie quel prodotto trova la
      // scorciatoia "1 porzione = Xg" già pronta.
      offServingQuantity?: number | null;
      offServingLabel?: string | null;
    }) => {
      let foodId: number | null = args.existingFoodId ?? null;
      let createdNewFood = false;
      if (foodId === null) {
        const existing = await foodsDB.findByName(args.foodName);
        if (existing) {
          foodId = existing.id;
        } else {
          const created = await foodsDB.createFood({
            name: args.foodName,
            caloriesPer100g: args.caloriesPer100g,
            proteinPer100g: args.proteinPer100g ?? null,
            carbsPer100g: args.carbsPer100g ?? null,
            fatPer100g: args.fatPer100g ?? null,
            source: args.source,
          });
          foodId = created.id;
          createdNewFood = true;
        }
      }
      if (
        createdNewFood &&
        foodId !== null &&
        args.offServingQuantity != null &&
        args.offServingQuantity > 0
      ) {
        try {
          await foodServingsDB.createServing({
            foodId,
            label: args.offServingLabel?.trim() || 'porzione',
            grams: args.offServingQuantity,
            isDefault: true,
            position: 0,
          });
        } catch {
          // Duplicato o errore minore: niente da fare.
        }
      }
      await mealsStore.createMeal({
        date,
        mealType,
        foodId,
        foodName: args.foodName,
        grams: args.grams,
        caloriesTotal: args.caloriesTotal,
        servingLabel: args.servingLabel,
        servingQty: args.servingQty,
        proteinTotal: scaleMacro(args.proteinPer100g, args.grams),
        carbsTotal: scaleMacro(args.carbsPer100g, args.grams),
        fatTotal: scaleMacro(args.fatPer100g, args.grams),
      });
      toast.show('Aggiunto!');
      onAdded?.();
      onClose();
    },
    [date, mealType, onAdded, onClose, toast],
  );

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerDot, { backgroundColor: info.color }]} />
          <View>
            <Text style={typography.label}>Aggiungi a</Text>
            <Text style={[typography.h1, { color: info.color }]}>{info.label}</Text>
          </View>
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

      <View style={styles.tabs}>
        <SegmentedControl options={TAB_OPTIONS} value={tab} onChange={setTab} />
      </View>

      <View style={styles.content}>
        {tab === 'search' ? (
          <SearchTab mealType={mealType} onCommit={commitMeal} />
        ) : tab === 'barcode' ? (
          <BarcodeTab visible={visible && tab === 'barcode'} mealType={mealType} onCommit={commitMeal} />
        ) : (
          <ManualTab onCommit={commitMeal} />
        )}
      </View>
    </BottomSheet>
  );
}

// -----------------------------------------------------------------------------
// Tab: Cerca
// -----------------------------------------------------------------------------

type CommitArgs = {
  foodName: string;
  caloriesPer100g: number;
  grams: number;
  caloriesTotal: number;
  servingLabel: string | null;
  servingQty: number | null;
  source: FoodSource;
  existingFoodId?: number | null;
  proteinPer100g?: number | null;
  carbsPer100g?: number | null;
  fatPer100g?: number | null;
  offServingQuantity?: number | null;
  offServingLabel?: string | null;
};

type CommitFn = (args: CommitArgs) => Promise<void>;

type SearchItem =
  | { kind: 'section'; title: string; key: string }
  | { kind: 'local'; food: Food; key: string }
  | { kind: 'remote'; product: OffProduct; key: string }
  | { kind: 'empty'; message: string; key: string }
  | { kind: 'loading'; key: string };

type Selected =
  | { source: 'local'; food: Food }
  | { source: 'remote'; product: OffProduct };

function SearchTab({ mealType, onCommit }: { mealType: MealType; onCommit: CommitFn }) {
  const [query, setQuery] = useState('');
  const [localResults, setLocalResults] = useState<Food[]>([]);
  const [remoteResults, setRemoteResults] = useState<OffProduct[]>([]);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [selectedServings, setSelectedServings] = useState<ServingOption[]>([]);
  const [editingServings, setEditingServings] = useState<Food | null>(null);
  const [servingsTick, setServingsTick] = useState(0);

  // Quando l'utente seleziona un food locale carichiamo le sue porzioni
  // alternative ("fetta", "cucchiaino"...) per popolare il GramsInputModal.
  // I food remoti partono senza porzioni: se OFF fornisce serving_quantity
  // la usiamo come singola porzione tipica.
  useEffect(() => {
    if (!selected) {
      setSelectedServings([]);
      return;
    }
    if (selected.source === 'remote') {
      const qty = selected.product.servingQuantity;
      if (qty != null && qty > 0) {
        setSelectedServings([{ label: 'porzione', grams: qty, isDefault: true }]);
      } else {
        setSelectedServings([]);
      }
      return;
    }
    let active = true;
    foodServingsDB
      .listServingsByFood(selected.food.id)
      .then((rows) => {
        if (!active) return;
        setSelectedServings(
          rows.map((r) => ({ label: r.label, grams: r.grams, isDefault: r.isDefault })),
        );
      })
      .catch(() => {
        if (active) setSelectedServings([]);
      });
    return () => {
      active = false;
    };
  }, [selected, servingsTick]);

  useEffect(() => {
    let active = true;
    const trimmed = query.trim();
    const promise = trimmed.length === 0
      ? foodsDB.listFoods(30)
      : foodsDB.searchFoods(trimmed, 30);
    promise
      .then((rows) => {
        if (active) setLocalResults(rows);
      })
      .catch(() => {
        if (active) setLocalResults([]);
      });
    return () => {
      active = false;
    };
  }, [query]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setRemoteResults([]);
      setLoadingRemote(false);
      setRemoteError(null);
      return;
    }
    const controller = new AbortController();
    const handle = setTimeout(() => {
      setLoadingRemote(true);
      setRemoteError(null);
      offSearch(trimmed, controller.signal)
        .then((products) => {
          setRemoteResults(products);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setRemoteResults([]);
          setRemoteError(
            err instanceof Error ? err.message : 'Impossibile contattare Open Food Facts',
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoadingRemote(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [query]);

  const items = useMemo<SearchItem[]>(() => {
    const out: SearchItem[] = [];
    out.push({ kind: 'section', title: 'Dal tuo database', key: 'sec-local' });
    if (localResults.length === 0) {
      out.push({ kind: 'empty', message: 'Nessun alimento locale', key: 'empty-local' });
    } else {
      for (const food of localResults) {
        out.push({ kind: 'local', food, key: `local-${food.id}` });
      }
    }

    out.push({ kind: 'section', title: 'Da Open Food Facts', key: 'sec-remote' });
    if (query.trim().length < 2) {
      out.push({
        kind: 'empty',
        message: 'Scrivi almeno 2 caratteri per cercare online',
        key: 'empty-remote-hint',
      });
    } else if (loadingRemote) {
      out.push({ kind: 'loading', key: 'loading-remote' });
    } else if (remoteError) {
      out.push({ kind: 'empty', message: remoteError, key: 'empty-remote-error' });
    } else {
      const localNames = new Set(localResults.map((f) => f.name.toLowerCase()));
      const filtered = remoteResults.filter(
        (p) => !localNames.has(p.name.toLowerCase()),
      );
      if (filtered.length === 0) {
        out.push({
          kind: 'empty',
          message: 'Nessun risultato online',
          key: 'empty-remote',
        });
      } else {
        for (const product of filtered) {
          out.push({
            kind: 'remote',
            product,
            key: `remote-${product.code ?? product.name}`,
          });
        }
      }
    }
    return out;
  }, [localResults, remoteResults, loadingRemote, remoteError, query]);

  const modalTarget: GramsInputTarget | null = useMemo(() => {
    if (!selected) return null;
    if (selected.source === 'local') {
      return {
        foodName: selected.food.name,
        caloriesPer100g: selected.food.caloriesPer100g,
        subtitle: sourceLabel(selected.food.source),
        servings: selectedServings,
      };
    }
    return {
      foodName: selected.product.name,
      caloriesPer100g: selected.product.caloriesPer100g,
      subtitle: selected.product.brand ?? 'Open Food Facts',
      servings: selectedServings,
    };
  }, [selected, selectedServings]);

  const handleConfirm = useCallback(
    async ({
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
      if (!selected) return;
      if (selected.source === 'local') {
        await onCommit({
          foodName: selected.food.name,
          caloriesPer100g: selected.food.caloriesPer100g,
          grams,
          caloriesTotal,
          servingLabel,
          servingQty,
          source: selected.food.source,
          existingFoodId: selected.food.id,
          proteinPer100g: selected.food.proteinPer100g,
          carbsPer100g: selected.food.carbsPer100g,
          fatPer100g: selected.food.fatPer100g,
        });
      } else {
        await onCommit({
          foodName: selected.product.name,
          caloriesPer100g: selected.product.caloriesPer100g,
          grams,
          caloriesTotal,
          servingLabel,
          servingQty,
          source: 'api',
          proteinPer100g: selected.product.proteinPer100g,
          carbsPer100g: selected.product.carbsPer100g,
          fatPer100g: selected.product.fatPer100g,
          offServingQuantity: selected.product.servingQuantity,
          offServingLabel: 'porzione',
        });
      }
      setSelected(null);
    },
    [onCommit, selected],
  );

  return (
    <View style={styles.tabContainer}>
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

      <FlatList
        data={items}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={ListSeparator}
        renderItem={({ item }) => {
          if (item.kind === 'section') {
            return (
              <Text style={[typography.label, styles.sectionTitle]}>{item.title}</Text>
            );
          }
          if (item.kind === 'empty') {
            return (
              <Text style={[typography.caption, styles.emptyText]}>{item.message}</Text>
            );
          }
          if (item.kind === 'loading') {
            return (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.textSec} />
                <Text style={typography.caption}>Cercando su Open Food Facts…</Text>
              </View>
            );
          }
          if (item.kind === 'local') {
            return (
              <ResultRow
                title={item.food.name}
                subtitle={`${item.food.caloriesPer100g} kcal / 100 g · ${sourceLabel(
                  item.food.source,
                )}`}
                onPress={() => setSelected({ source: 'local', food: item.food })}
                onEditServings={() => setEditingServings(item.food)}
              />
            );
          }
          return (
            <ResultRow
              title={item.product.name}
              subtitle={`${item.product.caloriesPer100g} kcal / 100 g · ${
                item.product.brand ?? 'Open Food Facts'
              }`}
              badge="OFF"
              onPress={() => setSelected({ source: 'remote', product: item.product })}
            />
          );
        }}
      />

      <GramsInputModal
        visible={selected !== null}
        target={modalTarget}
        mealType={mealType}
        onClose={() => setSelected(null)}
        onConfirm={handleConfirm}
      />

      <FoodServingsEditorModal
        visible={editingServings !== null}
        foodId={editingServings?.id ?? null}
        foodName={editingServings?.name ?? ''}
        onClose={() => setEditingServings(null)}
        onChanged={() => setServingsTick((n) => n + 1)}
      />
    </View>
  );
}

function ListSeparator() {
  return <View style={{ height: spacing.xs }} />;
}

function ResultRow({
  title,
  subtitle,
  badge,
  onPress,
  onEditServings,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  onPress: () => void;
  onEditServings?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.resultRow}>
      <View style={styles.resultText}>
        <Text style={typography.body} numberOfLines={1}>
          {title}
        </Text>
        <Text style={typography.caption} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={[typography.micro, { color: colors.blue }]}>{badge}</Text>
        </View>
      ) : null}
      {onEditServings ? (
        <Pressable
          onPress={onEditServings}
          style={styles.servingsEditBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Modifica porzioni di ${title}`}
        >
          <Icon name="pencil" size={14} color={colors.textSec} />
        </Pressable>
      ) : null}
      <Icon name="chevron-right" size={14} color={colors.textSec} />
    </Pressable>
  );
}

function sourceLabel(source: FoodSource): string {
  switch (source) {
    case 'manual':
      return 'manuale';
    case 'api':
      return 'Open Food Facts';
    case 'barcode':
      return 'barcode';
  }
}

// -----------------------------------------------------------------------------
// Tab: Barcode
// -----------------------------------------------------------------------------

function BarcodeTab({
  visible,
  mealType,
  onCommit,
}: {
  visible: boolean;
  mealType: MealType;
  onCommit: CommitFn;
}) {
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [product, setProduct] = useState<OffProduct | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const handledRef = useRef<string | null>(null);

  // Reset dello stato quando il tab cambia visibilità: evita di mostrare
  // l'ultimo prodotto scansionato tornando sul tab più tardi.
  useEffect(() => {
    if (!visible) {
      setScannedCode(null);
      setProduct(null);
      setLookupError(null);
      setLooking(false);
      handledRef.current = null;
    }
  }, [visible]);

  const handleScan = useCallback(async (code: string) => {
    if (handledRef.current === code) return;
    handledRef.current = code;
    setScannedCode(code);
    setProduct(null);
    setLookupError(null);
    setLooking(true);
    try {
      const found = await offByBarcode(code);
      if (!found) {
        setLookupError('Prodotto non trovato su Open Food Facts');
      } else {
        setProduct(found);
      }
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Errore contattando Open Food Facts');
    } finally {
      setLooking(false);
    }
  }, []);

  const resetScanner = useCallback(() => {
    handledRef.current = null;
    setScannedCode(null);
    setProduct(null);
    setLookupError(null);
    setLooking(false);
  }, []);

  const modalServings = useMemo<ServingOption[]>(() => {
    if (!product) return [];
    if (product.servingQuantity != null && product.servingQuantity > 0) {
      return [{ label: 'porzione', grams: product.servingQuantity, isDefault: true }];
    }
    return [];
  }, [product]);

  const modalTarget: GramsInputTarget | null = product
    ? {
        foodName: product.name,
        caloriesPer100g: product.caloriesPer100g,
        subtitle: product.brand ?? `Barcode ${scannedCode ?? ''}`.trim(),
        servings: modalServings,
      }
    : null;

  const handleConfirm = useCallback(
    async ({
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
      if (!product) return;
      await onCommit({
        foodName: product.name,
        caloriesPer100g: product.caloriesPer100g,
        grams,
        caloriesTotal,
        servingLabel,
        servingQty,
        source: 'barcode',
        proteinPer100g: product.proteinPer100g,
        carbsPer100g: product.carbsPer100g,
        fatPer100g: product.fatPer100g,
        offServingQuantity: product.servingQuantity,
        offServingLabel: 'porzione',
      });
      resetScanner();
    },
    [onCommit, product, resetScanner],
  );

  return (
    <View style={styles.tabContainer}>
      <ScannerView
        variant="compact"
        onScan={handleScan}
        paused={scannedCode !== null}
        helperText={scannedCode === null ? 'Inquadra il codice a barre' : undefined}
      />

      <View style={styles.scannerStatus}>
        {!scannedCode ? (
          <Text style={typography.caption}>
            Inquadra il codice a barre del prodotto.
          </Text>
        ) : looking ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.textSec} />
            <Text style={typography.caption}>Lettura di {scannedCode}…</Text>
          </View>
        ) : lookupError ? (
          <View style={styles.scannerResult}>
            <Text style={typography.body}>{lookupError}</Text>
            <Text style={typography.caption}>Codice letto: {scannedCode}</Text>
            <Button label="Scansiona di nuovo" variant="secondary" onPress={resetScanner} />
          </View>
        ) : product ? (
          <View style={styles.scannerResult}>
            <Text style={typography.body}>{product.name}</Text>
            <Text style={typography.caption}>
              {product.caloriesPer100g} kcal / 100 g
              {product.brand ? ` · ${product.brand}` : ''}
            </Text>
            <Text style={typography.caption}>Codice: {scannedCode}</Text>
            <Button label="Scansiona di nuovo" variant="secondary" onPress={resetScanner} />
          </View>
        ) : null}
      </View>

      <GramsInputModal
        visible={product !== null}
        target={modalTarget}
        mealType={mealType}
        onClose={resetScanner}
        onConfirm={handleConfirm}
      />
    </View>
  );
}

// -----------------------------------------------------------------------------
// Tab: Manuale
// -----------------------------------------------------------------------------

type ManualForm = {
  name: string;
  caloriesPer100g: string;
  grams: string;
  protein: string;
  carbs: string;
  fat: string;
};

function ManualTab({ onCommit }: { onCommit: CommitFn }) {
  const [savingFood, setSavingFood] = useState(false);
  const [adding, setAdding] = useState(false);
  const [savedFoodMessage, setSavedFoodMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    trigger,
    getValues,
    watch,
    reset,
    formState: { errors },
  } = useForm<ManualForm>({
    defaultValues: {
      name: '',
      caloriesPer100g: '',
      grams: '100',
      protein: '',
      carbs: '',
      fat: '',
    },
    mode: 'onChange',
  });

  const watched = watch();
  const caloriesNum = useMemo(() => parsePositive(watched.caloriesPer100g), [watched.caloriesPer100g]);
  const gramsNum = useMemo(() => parsePositive(watched.grams), [watched.grams]);

  const total = useMemo(() => {
    if (caloriesNum === null || gramsNum === null) return null;
    return Math.round(calculateMealCalories(caloriesNum, gramsNum));
  }, [caloriesNum, gramsNum]);

  async function handleSaveFood() {
    const ok = await trigger(['name', 'caloriesPer100g']);
    if (!ok) return;
    const values = getValues();
    const name = values.name.trim();
    const kcal = parsePositive(values.caloriesPer100g);
    if (!name || kcal === null) return;
    setSavingFood(true);
    setSavedFoodMessage(null);
    try {
      const existing = await foodsDB.findByName(name);
      if (existing) {
        setSavedFoodMessage('Alimento già presente in archivio');
      } else {
        await foodsDB.createFood({
          name,
          caloriesPer100g: kcal,
          proteinPer100g: parseOptional(values.protein),
          carbsPer100g: parseOptional(values.carbs),
          fatPer100g: parseOptional(values.fat),
          source: 'manual',
        });
        setSavedFoodMessage('Alimento salvato in archivio');
      }
    } finally {
      setSavingFood(false);
    }
  }

  async function handleAddToLog(values: ManualForm) {
    const name = values.name.trim();
    const kcal = parsePositive(values.caloriesPer100g);
    const grams = parsePositive(values.grams);
    if (!name || kcal === null || grams === null) return;
    setAdding(true);
    try {
      await onCommit({
        foodName: name,
        caloriesPer100g: kcal,
        grams,
        caloriesTotal: calculateMealCalories(kcal, grams),
        servingLabel: null,
        servingQty: null,
        source: 'manual',
        proteinPer100g: parseOptional(values.protein),
        carbsPer100g: parseOptional(values.carbs),
        fatPer100g: parseOptional(values.fat),
      });
      reset({
        name: '',
        caloriesPer100g: '',
        grams: '100',
        protein: '',
        carbs: '',
        fat: '',
      });
    } finally {
      setAdding(false);
    }
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.manualScroll}
    >
      <Text style={typography.label}>Nuovo alimento</Text>

      <Controller
        control={control}
        name="name"
        rules={{ validate: (v) => (v.trim().length > 0 ? true : 'Inserisci un nome') }}
        render={({ field: { value, onChange, onBlur } }) => (
          <FieldWrap error={errors.name?.message}>
            <Input
              label="Nome alimento"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="sentences"
              placeholder="Es. Pasta integrale"
            />
          </FieldWrap>
        )}
      />

      <Controller
        control={control}
        name="caloriesPer100g"
        rules={{ validate: (v) => parsePositive(v) !== null || 'Inserisci kcal per 100 g validi' }}
        render={({ field: { value, onChange, onBlur } }) => (
          <FieldWrap error={errors.caloriesPer100g?.message}>
            <Input
              label="Calorie per 100 g"
              unit="kcal"
              keyboardType="decimal-pad"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="120"
            />
          </FieldWrap>
        )}
      />

      <Controller
        control={control}
        name="grams"
        rules={{ validate: (v) => parsePositive(v) !== null || 'Inserisci un valore in grammi' }}
        render={({ field: { value, onChange, onBlur } }) => (
          <FieldWrap error={errors.grams?.message}>
            <Input
              label="Quantità"
              unit="g"
              keyboardType="decimal-pad"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          </FieldWrap>
        )}
      />

      <Text style={typography.label}>Macro per 100 g (opzionali)</Text>

      <Controller
        control={control}
        name="protein"
        rules={{ validate: validateOptionalMacro }}
        render={({ field: { value, onChange, onBlur } }) => (
          <FieldWrap error={errors.protein?.message}>
            <Input
              label="Proteine"
              unit="g"
              keyboardType="decimal-pad"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="—"
            />
          </FieldWrap>
        )}
      />

      <Controller
        control={control}
        name="carbs"
        rules={{ validate: validateOptionalMacro }}
        render={({ field: { value, onChange, onBlur } }) => (
          <FieldWrap error={errors.carbs?.message}>
            <Input
              label="Carboidrati"
              unit="g"
              keyboardType="decimal-pad"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="—"
            />
          </FieldWrap>
        )}
      />

      <Controller
        control={control}
        name="fat"
        rules={{ validate: validateOptionalMacro }}
        render={({ field: { value, onChange, onBlur } }) => (
          <FieldWrap error={errors.fat?.message}>
            <Input
              label="Grassi"
              unit="g"
              keyboardType="decimal-pad"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="—"
            />
          </FieldWrap>
        )}
      />

      <View style={styles.totalRow}>
        <Text style={typography.label}>Totale calcolato</Text>
        <Text style={typography.value}>
          {total !== null ? `${total} kcal` : '—'}
        </Text>
      </View>

      {savedFoodMessage ? (
        <Text style={[typography.caption, { color: colors.green }]}>{savedFoodMessage}</Text>
      ) : null}

      <View style={styles.manualActions}>
        <Button
          label="Salva negli alimenti"
          variant="secondary"
          onPress={handleSubmit(handleSaveFood)}
          loading={savingFood}
        />
        <Button
          label="Aggiungi al log"
          onPress={handleSubmit(handleAddToLog)}
          loading={adding}
        />
      </View>
    </ScrollView>
  );
}

function FieldWrap({ children, error }: { children: React.ReactNode; error?: string }) {
  return (
    <View style={styles.fieldWrap}>
      {children}
      {error ? (
        <Text style={[typography.caption, { color: colors.red }]}>{error}</Text>
      ) : null}
    </View>
  );
}

function parsePositive(raw: string): number | null {
  const n = Number(String(raw).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Parse di un macro opzionale: stringa vuota → null. Solo numeri >= 0
// vengono accettati; il caller dovrà validare separatamente la non-positività
// quando serve un valore strict (qui no: i macro possono essere 0).
function parseOptional(raw: string): number | null {
  const trimmed = String(raw).trim();
  if (trimmed.length === 0) return null;
  const n = Number(trimmed.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function validateOptionalMacro(raw: string): true | string {
  const trimmed = String(raw).trim();
  if (trimmed.length === 0) return true;
  const n = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return 'Inserisci un valore valido';
  return true;
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  headerDot: {
    width: 10,
    height: 10,
    borderRadius: radii.round,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.round,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    paddingBottom: spacing.xl,
  },
  content: {
    flex: 1,
  },
  tabContainer: {
    flex: 1,
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
    paddingVertical: Platform.OS === 'ios' ? spacing.lg : spacing.md,
    fontSize: 14,
    color: colors.text,
    fontFamily: typography.body.fontFamily,
  },
  listContent: {
    paddingBottom: spacing.screen,
    gap: spacing.xs,
  },
  sectionTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    paddingVertical: spacing.md,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  resultText: {
    flex: 1,
    gap: spacing.xxs,
  },
  badge: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.blueLight,
  },
  servingsEditBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.round,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerStatus: {
    gap: spacing.md,
  },
  scannerResult: {
    gap: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  manualScroll: {
    gap: spacing.xl,
    paddingBottom: spacing.screen,
  },
  fieldWrap: {
    gap: spacing.xs,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  manualActions: {
    gap: spacing.xl,
  },
});

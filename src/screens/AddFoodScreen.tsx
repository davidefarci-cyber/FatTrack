import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { GramsInputModal } from '@/components/GramsInputModal';
import type { GramsInputTarget } from '@/components/GramsInputModal';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/Input';
import { MEAL_INFO } from '@/components/mealMeta';
import { SegmentedControl } from '@/components/SegmentedControl';
import { foodsDB, mealsDB } from '@/database';
import type { Food, FoodSource, MealType } from '@/database';
import { colors, radii, spacing, typography } from '@/theme';
import { calculateMealCalories } from '@/utils/calorieCalculator';
import { offByBarcode, offSearch } from '@/utils/openFoodFacts';
import type { OffProduct } from '@/utils/openFoodFacts';
import type { HomeStackParamList } from '@/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'AddFood'>;

type TabKey = 'search' | 'barcode' | 'manual';

const TAB_OPTIONS: ReadonlyArray<{ value: TabKey; label: string }> = [
  { value: 'search', label: 'Cerca' },
  { value: 'barcode', label: 'Barcode' },
  { value: 'manual', label: 'Manuale' },
];

const SEARCH_DEBOUNCE_MS = 400;

export default function AddFoodScreen({ route, navigation }: Props) {
  const { mealType, date } = route.params;
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>('search');

  const info = MEAL_INFO[mealType];

  // Persistenza condivisa: ogni tab chiama questa funzione al momento della
  // conferma. Se l'alimento non esiste ancora lo salviamo in `foods` (futura
  // ricerca più veloce e source tracciabile), poi creiamo il record pasto.
  const commitMeal = useCallback(
    async (args: {
      foodName: string;
      caloriesPer100g: number;
      grams: number;
      caloriesTotal: number;
      source: FoodSource;
      existingFoodId?: number | null;
    }): Promise<void> => {
      let foodId: number | null = args.existingFoodId ?? null;
      if (foodId === null) {
        const existing = await foodsDB.findByName(args.foodName);
        if (existing) {
          foodId = existing.id;
        } else {
          const created = await foodsDB.createFood({
            name: args.foodName,
            caloriesPer100g: args.caloriesPer100g,
            source: args.source,
          });
          foodId = created.id;
        }
      }
      await mealsDB.createMeal({
        date,
        mealType,
        foodId,
        foodName: args.foodName,
        grams: args.grams,
        caloriesTotal: args.caloriesTotal,
      });
    },
    [date, mealType],
  );

  const handleCommitAndGoBack = useCallback(
    async (args: Parameters<typeof commitMeal>[0]) => {
      await commitMeal(args);
      navigation.goBack();
    },
    [commitMeal, navigation],
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Indietro"
        >
          <Icon name="chevron-left" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={typography.label}>Aggiungi a</Text>
          <Text style={[typography.h1, { color: info.color }]}>{info.label}</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <SegmentedControl options={TAB_OPTIONS} value={tab} onChange={setTab} />
      </View>

      <View style={styles.content}>
        {tab === 'search' ? (
          <SearchTab mealType={mealType} onCommit={handleCommitAndGoBack} />
        ) : tab === 'barcode' ? (
          <BarcodeTab mealType={mealType} onCommit={handleCommitAndGoBack} />
        ) : (
          <ManualTab mealType={mealType} onCommit={handleCommitAndGoBack} />
        )}
      </View>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Tab: ricerca (locale + Open Food Facts)
// -----------------------------------------------------------------------------

type CommitArgs = {
  foodName: string;
  caloriesPer100g: number;
  grams: number;
  caloriesTotal: number;
  source: FoodSource;
  existingFoodId?: number | null;
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

function SearchTab({
  mealType,
  onCommit,
}: {
  mealType: MealType;
  onCommit: CommitFn;
}) {
  const [query, setQuery] = useState('');
  const [localResults, setLocalResults] = useState<Food[]>([]);
  const [remoteResults, setRemoteResults] = useState<OffProduct[]>([]);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);

  // Ricerca locale immediata: la query su SQLite è istantanea.
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

  // Ricerca OFF con debounce + AbortController: cancelliamo la fetch precedente
  // quando l'utente continua a digitare, altrimenti la race ci farebbe vedere
  // risultati obsoleti.
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
      // Dedupe: se un prodotto remoto ha lo stesso nome di uno locale, saltiamolo.
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
      };
    }
    return {
      foodName: selected.product.name,
      caloriesPer100g: selected.product.caloriesPer100g,
      subtitle: selected.product.brand ?? 'Open Food Facts',
    };
  }, [selected]);

  const handleConfirm = useCallback(
    async ({ grams, caloriesTotal }: { grams: number; caloriesTotal: number }) => {
      if (!selected) return;
      if (selected.source === 'local') {
        await onCommit({
          foodName: selected.food.name,
          caloriesPer100g: selected.food.caloriesPer100g,
          grams,
          caloriesTotal,
          source: selected.food.source,
          existingFoodId: selected.food.id,
        });
      } else {
        await onCommit({
          foodName: selected.product.name,
          caloriesPer100g: selected.product.caloriesPer100g,
          grams,
          caloriesTotal,
          source: 'api',
        });
      }
      setSelected(null);
    },
    [onCommit, selected],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.tabContainer}
    >
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
              <Text style={[typography.label, styles.sectionTitle]}>
                {item.title}
              </Text>
            );
          }
          if (item.kind === 'empty') {
            return (
              <Text style={[typography.caption, styles.emptyText]}>
                {item.message}
              </Text>
            );
          }
          if (item.kind === 'loading') {
            return (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.textSec} />
                <Text style={typography.caption}>Cercando su Open Food Facts\u2026</Text>
              </View>
            );
          }
          if (item.kind === 'local') {
            return (
              <ResultRow
                title={item.food.name}
                subtitle={`${item.food.caloriesPer100g} kcal / 100 g \u00b7 ${sourceLabel(
                  item.food.source,
                )}`}
                onPress={() => setSelected({ source: 'local', food: item.food })}
              />
            );
          }
          return (
            <ResultRow
              title={item.product.name}
              subtitle={`${item.product.caloriesPer100g} kcal / 100 g \u00b7 ${
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
    </KeyboardAvoidingView>
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
}: {
  title: string;
  subtitle: string;
  badge?: string;
  onPress: () => void;
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
// Tab: barcode
// -----------------------------------------------------------------------------

function BarcodeTab({
  mealType,
  onCommit,
}: {
  mealType: MealType;
  onCommit: CommitFn;
}) {
  const [permission, setPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [product, setProduct] = useState<OffProduct | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  // Evitiamo re-scan dello stesso codice: lo scanner emette a ripetizione.
  const lastCodeRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    BarCodeScanner.requestPermissionsAsync()
      .then(({ status }) => {
        if (!active) return;
        setPermission(status === 'granted' ? 'granted' : 'denied');
      })
      .catch(() => {
        if (active) setPermission('denied');
      });
    return () => {
      active = false;
    };
  }, []);

  const handleScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (!data || lastCodeRef.current === data) return;
      lastCodeRef.current = data;
      setScannedCode(data);
      setProduct(null);
      setLookupError(null);
      setLooking(true);
      try {
        const found = await offByBarcode(data);
        if (!found) {
          setLookupError('Prodotto non trovato su Open Food Facts');
        } else {
          setProduct(found);
        }
      } catch (err) {
        setLookupError(
          err instanceof Error ? err.message : 'Errore contattando Open Food Facts',
        );
      } finally {
        setLooking(false);
      }
    },
    [],
  );

  const resetScanner = useCallback(() => {
    lastCodeRef.current = null;
    setScannedCode(null);
    setProduct(null);
    setLookupError(null);
    setLooking(false);
  }, []);

  const modalTarget: GramsInputTarget | null = product
    ? {
        foodName: product.name,
        caloriesPer100g: product.caloriesPer100g,
        subtitle: product.brand ?? `Barcode ${scannedCode ?? ''}`.trim(),
      }
    : null;

  const handleConfirm = useCallback(
    async ({ grams, caloriesTotal }: { grams: number; caloriesTotal: number }) => {
      if (!product) return;
      await onCommit({
        foodName: product.name,
        caloriesPer100g: product.caloriesPer100g,
        grams,
        caloriesTotal,
        source: 'barcode',
      });
      resetScanner();
    },
    [onCommit, product, resetScanner],
  );

  if (permission === 'pending') {
    return (
      <View style={styles.statusBox}>
        <ActivityIndicator color={colors.textSec} />
        <Text style={typography.caption}>Controllo dei permessi\u2026</Text>
      </View>
    );
  }

  if (permission === 'denied') {
    return (
      <View style={styles.statusBox}>
        <Text style={typography.body}>Accesso fotocamera negato</Text>
        <Text style={typography.caption}>
          Abilita la fotocamera nelle impostazioni del sistema per scansionare i
          codici a barre.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.tabContainer}>
      <View style={styles.scannerWrap}>
        <BarCodeScanner
          onBarCodeScanned={scannedCode ? undefined : handleScanned}
          style={StyleSheet.absoluteFillObject}
        />
        <View pointerEvents="none" style={styles.scannerOverlay}>
          <View style={styles.scannerFrame} />
        </View>
      </View>

      <View style={styles.scannerStatus}>
        {!scannedCode ? (
          <Text style={typography.caption}>
            Inquadra il codice a barre del prodotto.
          </Text>
        ) : looking ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.textSec} />
            <Text style={typography.caption}>
              Lettura di {scannedCode}\u2026
            </Text>
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
              {product.brand ? ` \u00b7 ${product.brand}` : ''}
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
// Tab: manuale
// -----------------------------------------------------------------------------

type ManualForm = {
  name: string;
  caloriesPer100g: string;
  grams: string;
};

function ManualTab({
  mealType,
  onCommit,
}: {
  mealType: MealType;
  onCommit: CommitFn;
}) {
  const insets = useSafeAreaInsets();
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
    defaultValues: { name: '', caloriesPer100g: '', grams: '100' },
    mode: 'onChange',
  });

  const watched = watch();

  const caloriesNum = useMemo(
    () => parsePositive(watched.caloriesPer100g),
    [watched.caloriesPer100g],
  );
  const gramsNum = useMemo(() => parsePositive(watched.grams), [watched.grams]);

  const total = useMemo(() => {
    if (caloriesNum === null || gramsNum === null) return null;
    return Math.round(calculateMealCalories(caloriesNum, gramsNum));
  }, [caloriesNum, gramsNum]);

  // "Salva negli alimenti" richiede solo nome + kcal/100g: valido anche se i
  // grammi non sono ancora stati inseriti. `trigger` sui soli campi necessari
  // evita di bloccare il pulsante per colpa della validazione dei grammi.
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
        setSavedFoodMessage('Alimento gi\u00e0 presente in archivio');
      } else {
        await foodsDB.createFood({ name, caloriesPer100g: kcal, source: 'manual' });
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
        source: 'manual',
      });
      reset({ name: '', caloriesPer100g: '', grams: '100' });
    } finally {
      setAdding(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.tabContainer}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.manualScroll,
          { paddingBottom: insets.bottom + spacing.screen },
        ]}
      >
        <Card style={styles.manualCard}>
          <Text style={typography.label}>Nuovo alimento</Text>

          <Controller
            control={control}
            name="name"
            rules={{
              validate: (v) => (v.trim().length > 0 ? true : 'Inserisci un nome'),
            }}
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
            rules={{
              validate: (v) =>
                parsePositive(v) !== null || 'Inserisci kcal per 100 g validi',
            }}
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
            rules={{
              validate: (v) =>
                parsePositive(v) !== null || 'Inserisci un valore in grammi',
            }}
            render={({ field: { value, onChange, onBlur } }) => (
              <FieldWrap error={errors.grams?.message}>
                <Input
                  label="Quantit\u00e0"
                  unit="g"
                  keyboardType="decimal-pad"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                />
              </FieldWrap>
            )}
          />

          <View style={styles.totalRow}>
            <Text style={typography.label}>Totale calcolato</Text>
            <Text style={typography.value}>
              {total !== null ? `${total} kcal` : '\u2014'}
            </Text>
          </View>
        </Card>

        {savedFoodMessage ? (
          <Text style={[typography.caption, { color: colors.green }]}>
            {savedFoodMessage}
          </Text>
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
    </KeyboardAvoidingView>
  );
}

function FieldWrap({
  children,
  error,
}: {
  children: React.ReactNode;
  error?: string;
}) {
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

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.round,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: spacing.xxs,
  },
  tabs: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  content: {
    flex: 1,
  },
  tabContainer: {
    flex: 1,
    paddingHorizontal: spacing.screen,
    gap: spacing.xl,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
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
  listContent: {
    paddingBottom: spacing.screen,
    gap: spacing.xs,
  },
  sectionTitle: {
    marginTop: spacing.xl,
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
  scannerWrap: {
    height: 280,
    borderRadius: radii.xxl,
    overflow: 'hidden',
    backgroundColor: colors.text,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: '70%',
    height: 140,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.card,
  },
  scannerStatus: {
    gap: spacing.md,
  },
  scannerResult: {
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  statusBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.screen,
  },
  manualScroll: {
    padding: spacing.screen,
    paddingTop: 0,
    gap: spacing.xl,
  },
  manualCard: {
    padding: spacing.screen,
    gap: spacing.xl,
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

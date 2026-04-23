import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { GramsInputModal } from '@/components/GramsInputModal';
import type { GramsInputTarget } from '@/components/GramsInputModal';
import { Icon } from '@/components/Icon';
import { MEAL_INFO, MEAL_ORDER } from '@/components/mealMeta';
import { ScannerView } from '@/components/ScannerView';
import { useToast } from '@/components/Toast';
import { foodsDB, mealsDB } from '@/database';
import type { MealType } from '@/database';
import { todayISO } from '@/hooks/useDailyLog';
import { colors, radii, spacing, typography } from '@/theme';
import { offByBarcode } from '@/utils/openFoodFacts';
import type { OffProduct } from '@/utils/openFoodFacts';

// Schermata Scansiona standalone: camera a tutta pagina + lookup su OFF.
// Consente di scegliere il pasto di destinazione (default suggerito in base
// all'ora); dopo la conferma dei grammi il pasto è salvato direttamente nel
// diario del giorno corrente.

const LOOKUP_STATE = {
  idle: 'idle',
  loading: 'loading',
  product: 'product',
  error: 'error',
} as const;
type LookupState = (typeof LOOKUP_STATE)[keyof typeof LOOKUP_STATE];

function inferInitialMeal(): MealType {
  const h = new Date().getHours();
  if (h < 11) return 'colazione';
  if (h < 15) return 'pranzo';
  if (h < 19) return 'spuntino';
  return 'cena';
}

export default function BarcodeScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [mealType, setMealType] = useState<MealType>(() => inferInitialMeal());
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [product, setProduct] = useState<OffProduct | null>(null);
  const [lookupState, setLookupState] = useState<LookupState>(LOOKUP_STATE.idle);
  const [error, setError] = useState<string | null>(null);

  const handleScan = useCallback(async (code: string) => {
    setScannedCode(code);
    setLookupState(LOOKUP_STATE.loading);
    setError(null);
    try {
      const found = await offByBarcode(code);
      if (!found) {
        setError('Prodotto non trovato su Open Food Facts');
        setLookupState(LOOKUP_STATE.error);
      } else {
        setProduct(found);
        setLookupState(LOOKUP_STATE.product);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di rete');
      setLookupState(LOOKUP_STATE.error);
    }
  }, []);

  const reset = useCallback(() => {
    setScannedCode(null);
    setProduct(null);
    setError(null);
    setLookupState(LOOKUP_STATE.idle);
  }, []);

  const target: GramsInputTarget | null = product
    ? {
        foodName: product.name,
        caloriesPer100g: product.caloriesPer100g,
        subtitle: product.brand ?? `Barcode ${scannedCode ?? ''}`.trim(),
      }
    : null;

  const handleConfirm = useCallback(
    async ({ grams, caloriesTotal }: { grams: number; caloriesTotal: number }) => {
      if (!product) return;
      // Persistiamo l'alimento in archivio così la prossima ricerca è istantanea.
      let foodId: number | null = null;
      const existing = await foodsDB.findByName(product.name);
      if (existing) {
        foodId = existing.id;
      } else {
        const created = await foodsDB.createFood({
          name: product.name,
          caloriesPer100g: product.caloriesPer100g,
          source: 'barcode',
        });
        foodId = created.id;
      }
      await mealsDB.createMeal({
        date: todayISO(),
        mealType,
        foodId,
        foodName: product.name,
        grams,
        caloriesTotal,
      });
      reset();
      toast.show('Aggiunto!');
    },
    [mealType, product, reset, toast],
  );

  const paused = lookupState !== LOOKUP_STATE.idle;

  return (
    <View style={styles.container}>
      <ScannerView
        variant="full"
        onScan={handleScan}
        paused={paused}
        helperText={lookupState === LOOKUP_STATE.idle ? 'Inquadra il codice a barre del prodotto' : undefined}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Scansiona</Text>
        <MealSelectorDropdown value={mealType} onChange={setMealType} />
      </View>

      {lookupState !== LOOKUP_STATE.idle ? (
        <View style={[styles.statusCard, { bottom: insets.bottom + spacing.screen }]}>
          <StatusContent
            state={lookupState}
            scannedCode={scannedCode}
            product={product}
            error={error}
            onReset={reset}
          />
        </View>
      ) : null}

      <GramsInputModal
        visible={lookupState === LOOKUP_STATE.product}
        target={target}
        mealType={mealType}
        onClose={reset}
        onConfirm={handleConfirm}
      />
    </View>
  );
}

function StatusContent({
  state,
  scannedCode,
  product,
  error,
  onReset,
}: {
  state: LookupState;
  scannedCode: string | null;
  product: OffProduct | null;
  error: string | null;
  onReset: () => void;
}) {
  if (state === LOOKUP_STATE.loading) {
    return (
      <View style={styles.statusRow}>
        <ActivityIndicator color={colors.textSec} />
        <Text style={typography.caption}>Lettura di {scannedCode}…</Text>
      </View>
    );
  }
  if (state === LOOKUP_STATE.error) {
    return (
      <View style={styles.statusCol}>
        <Text style={typography.body}>{error ?? 'Errore'}</Text>
        {scannedCode ? (
          <Text style={typography.caption}>Codice letto: {scannedCode}</Text>
        ) : null}
        <Button label="Scansiona di nuovo" variant="secondary" onPress={onReset} />
      </View>
    );
  }
  if (state === LOOKUP_STATE.product && product) {
    return (
      <View style={styles.statusCol}>
        <Text style={typography.body}>{product.name}</Text>
        <Text style={typography.caption}>
          {product.caloriesPer100g} kcal / 100 g
          {product.brand ? ` · ${product.brand}` : ''}
        </Text>
      </View>
    );
  }
  return null;
}

function MealSelectorDropdown({
  value,
  onChange,
}: {
  value: MealType;
  onChange: (next: MealType) => void;
}) {
  const [open, setOpen] = useState(false);
  const info = MEAL_INFO[value];

  const options = useMemo(() => MEAL_ORDER, []);

  useEffect(() => {
    if (!open) return;
    // Nessun listener globale necessario: il chip si chiude quando si tocca una voce.
  }, [open]);

  return (
    <View style={styles.dropdown}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={[styles.dropdownTrigger, { backgroundColor: info.bg }]}
        accessibilityRole="button"
        accessibilityLabel={`Seleziona pasto (attuale: ${info.label})`}
      >
        <View style={[styles.dropdownDot, { backgroundColor: info.color }]} />
        <Text style={[typography.bodyBold, { color: info.color }]}>{info.label}</Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={14} color={info.color} />
      </Pressable>
      {open ? (
        <View style={styles.dropdownMenu}>
          {options.map((opt) => {
            const optInfo = MEAL_INFO[opt];
            return (
              <Pressable
                key={opt}
                onPress={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                style={styles.dropdownItem}
              >
                <View style={[styles.dropdownDot, { backgroundColor: optInfo.color }]} />
                <Text style={typography.body}>{optInfo.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.text,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.card,
  },
  statusCard: {
    position: 'absolute',
    left: spacing.screen,
    right: spacing.screen,
    backgroundColor: colors.card,
    borderRadius: radii.xxl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusCol: {
    gap: spacing.md,
  },
  dropdown: {
    position: 'relative',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.round,
  },
  dropdownDot: {
    width: 8,
    height: 8,
    borderRadius: radii.round,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    minWidth: 160,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
});

import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarcodeResultCard, BARCODE_SUCCESS_RESET_MS } from '@/components/BarcodeResultCard';
import type { BarcodeResultCardState } from '@/components/BarcodeResultCard';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScannerView } from '@/components/ScannerView';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useToast } from '@/components/Toast';
import { foodsDB, mealsStore } from '@/database';
import type { MealType } from '@/database';
import { todayISO } from '@/hooks/useDailyLog';
import { colors, spacing, typography } from '@/theme';
import { offByBarcode } from '@/utils/openFoodFacts';
import type { OffProduct } from '@/utils/openFoodFacts';

// Schermata Scansiona standalone: camera compatta in alto + card risultato
// inline sotto. La card risultato mostra macros, grammi e pasto di destinazione
// senza aprire un modale separato, come nel prototipo.

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
  const [confirmState, setConfirmState] = useState<BarcodeResultCardState>('idle');

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
    setConfirmState('idle');
    setLookupState(LOOKUP_STATE.idle);
  }, []);

  const handleConfirm = useCallback(
    async ({ grams, caloriesTotal }: { grams: number; caloriesTotal: number }) => {
      if (!product) return;
      setConfirmState('adding');
      try {
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
        await mealsStore.createMeal({
          date: todayISO(),
          mealType,
          foodId,
          foodName: product.name,
          grams,
          caloriesTotal,
        });
        setConfirmState('added');
        toast.show('Aggiunto!');
        setTimeout(reset, BARCODE_SUCCESS_RESET_MS);
      } catch {
        setConfirmState('idle');
      }
    },
    [mealType, product, reset, toast],
  );

  const scannerPaused = lookupState !== LOOKUP_STATE.idle;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Scansiona"
        subtitle="Leggi il barcode di un prodotto"
        style={{ paddingTop: insets.top + spacing.xl }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.screen * 2 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.scannerWrap}>
          <ScannerView
            variant="compact"
            onScan={handleScan}
            paused={scannerPaused}
            helperText={
              lookupState === LOOKUP_STATE.idle
                ? 'Inquadra il codice a barre'
                : undefined
            }
          />
        </View>

        {lookupState === LOOKUP_STATE.loading ? (
          <Card style={styles.statusCard}>
            <View style={styles.statusRow}>
              <ActivityIndicator color={colors.textSec} />
              <Text style={typography.caption}>
                Lettura di {scannedCode ?? '…'}
              </Text>
            </View>
          </Card>
        ) : null}

        {lookupState === LOOKUP_STATE.error ? (
          <Card style={styles.statusCard}>
            <Text style={typography.body}>{error ?? 'Errore'}</Text>
            {scannedCode ? (
              <Text style={typography.caption}>Codice letto: {scannedCode}</Text>
            ) : null}
            <Button label="Scansiona di nuovo" variant="secondary" onPress={reset} />
          </Card>
        ) : null}

        {lookupState === LOOKUP_STATE.product && product ? (
          <BarcodeResultCard
            product={product}
            mealType={mealType}
            onMealChange={setMealType}
            onConfirm={handleConfirm}
            onRescan={reset}
            state={confirmState}
          />
        ) : null}
      </ScrollView>
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
  scannerWrap: {
    aspectRatio: 4 / 3,
    width: '100%',
  },
  statusCard: {
    padding: spacing.screen,
    gap: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});

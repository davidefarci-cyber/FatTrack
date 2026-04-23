import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { MEAL_INFO, MEAL_ORDER } from '@/components/mealMeta';
import type { MealType } from '@/database';
import { colors, radii, spacing, typography } from '@/theme';
import type { OffProduct } from '@/utils/openFoodFacts';

export type BarcodeResultCardState = 'idle' | 'adding' | 'added';

type BarcodeResultCardProps = {
  product: OffProduct;
  mealType: MealType;
  onMealChange: (next: MealType) => void;
  onConfirm: (args: { grams: number; caloriesTotal: number }) => void;
  onRescan: () => void;
  state?: BarcodeResultCardState;
};

const DEFAULT_GRAMS = '100';
const SUCCESS_RESET_MS = 1800;

export function BarcodeResultCard({
  product,
  mealType,
  onMealChange,
  onConfirm,
  onRescan,
  state = 'idle',
}: BarcodeResultCardProps) {
  const info = MEAL_INFO[mealType];
  const [gramsText, setGramsText] = useState(DEFAULT_GRAMS);
  const [mealOpen, setMealOpen] = useState(false);

  // Reset grams when the product changes (new scan result).
  useEffect(() => {
    setGramsText(DEFAULT_GRAMS);
  }, [product.code, product.name]);

  // Brief success state auto-reset happens from the parent via `state`.
  // We only close the dropdown as a side-effect of "added".
  useEffect(() => {
    if (state === 'added') setMealOpen(false);
  }, [state]);

  const grams = useMemo(() => parseGrams(gramsText), [gramsText]);
  const caloriesTotal =
    grams !== null ? Math.round((product.caloriesPer100g * grams) / 100) : 0;
  const canConfirm = grams !== null && grams > 0 && state === 'idle';

  const addedTone = state === 'added';
  const confirmLabel = addedTone
    ? '✓ Aggiunto!'
    : state === 'adding'
    ? 'Aggiungo…'
    : `Aggiungi a ${info.label}`;
  const confirmBg = addedTone ? colors.greenLight : info.color;
  const confirmColor = addedTone ? colors.green : colors.card;

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.productText}>
          {product.brand ? (
            <Text style={typography.caption} numberOfLines={1}>
              {product.brand}
            </Text>
          ) : null}
          <Text style={typography.h1} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={typography.caption}>
            {product.caloriesPer100g} kcal / 100 g
          </Text>
        </View>
        <View style={[styles.totalBadge, { backgroundColor: colors.greenLight }]}>
          <Text style={[typography.label, { color: colors.green }]}>Totale</Text>
          <Text style={[typography.value, { color: colors.green }]}>
            {caloriesTotal.toLocaleString('it-IT')}
          </Text>
          <Text style={[typography.micro, { color: colors.green }]}>kcal</Text>
        </View>
      </View>

      {hasAnyMacro(product) ? (
        <View style={styles.macrosRow}>
          <MacroPill
            label="Proteine"
            value={product.proteinPer100g}
            color={colors.blue}
            bg={colors.blueLight}
          />
          <MacroPill
            label="Carboidrati"
            value={product.carbsPer100g}
            color={colors.orange}
            bg={colors.orangeLight}
          />
          <MacroPill
            label="Grassi"
            value={product.fatPer100g}
            color={colors.purple}
            bg={colors.purpleLight}
          />
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <View style={styles.gramsField}>
          <Text style={typography.label}>Grammi</Text>
          <View style={styles.gramsInputWrap}>
            <TextInput
              value={gramsText}
              onChangeText={setGramsText}
              keyboardType="number-pad"
              selectTextOnFocus
              placeholderTextColor={colors.textSec}
              style={styles.gramsInput}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            <Text style={styles.gramsUnit}>g</Text>
          </View>
        </View>

        <MealDropdown
          value={mealType}
          open={mealOpen}
          onToggle={() => setMealOpen((v) => !v)}
          onSelect={(next) => {
            onMealChange(next);
            setMealOpen(false);
          }}
        />
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onRescan}
          style={styles.secondaryBtn}
          accessibilityRole="button"
          accessibilityLabel="Scansiona di nuovo"
        >
          <Text style={[typography.bodyBold, { color: colors.textSec }]}>
            Riscan.
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            if (!canConfirm || grams === null) return;
            onConfirm({ grams, caloriesTotal });
          }}
          disabled={!canConfirm}
          style={[
            styles.primaryBtn,
            { backgroundColor: confirmBg, opacity: canConfirm || addedTone ? 1 : 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={confirmLabel}
        >
          {state === 'adding' ? (
            <ActivityIndicator color={colors.card} />
          ) : (
            <Text style={[typography.bodyBold, { color: confirmColor }]}>
              {confirmLabel}
            </Text>
          )}
        </Pressable>
      </View>

      {product.code ? (
        <Text style={[typography.micro, styles.barcodeText]}>
          Barcode {product.code}
        </Text>
      ) : null}
    </Card>
  );
}

function MacroPill({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number | null;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.macroPill, { backgroundColor: bg }]}>
      <Text style={[typography.label, { color }]}>{label}</Text>
      <Text style={[typography.bodyBold, { color }]}>
        {value === null ? '—' : `${formatMacro(value)} g`}
      </Text>
    </View>
  );
}

function MealDropdown({
  value,
  open,
  onToggle,
  onSelect,
}: {
  value: MealType;
  open: boolean;
  onToggle: () => void;
  onSelect: (next: MealType) => void;
}) {
  const info = MEAL_INFO[value];
  return (
    <View style={styles.mealDropdown}>
      <Pressable
        onPress={onToggle}
        style={[styles.mealTrigger, { backgroundColor: info.bg }]}
        accessibilityRole="button"
        accessibilityLabel={`Pasto: ${info.label}`}
      >
        <View style={[styles.mealDot, { backgroundColor: info.color }]} />
        <Text style={[typography.bodyBold, { color: info.color }]}>
          {info.label}
        </Text>
        <Icon
          name={open ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={info.color}
        />
      </Pressable>
      {open ? (
        <View style={styles.mealMenu}>
          {MEAL_ORDER.map((opt) => {
            const o = MEAL_INFO[opt];
            return (
              <Pressable
                key={opt}
                onPress={() => onSelect(opt)}
                style={styles.mealItem}
              >
                <View style={[styles.mealDot, { backgroundColor: o.color }]} />
                <Text style={typography.body}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function hasAnyMacro(p: OffProduct): boolean {
  return p.proteinPer100g !== null || p.carbsPer100g !== null || p.fatPer100g !== null;
}

function formatMacro(v: number): string {
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

function parseGrams(raw: string): number | null {
  const n = Number(raw.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0 || n > 5000) return null;
  return n;
}

// Expose a stable success timeout constant for parents that want to auto-reset.
export const BARCODE_SUCCESS_RESET_MS = SUCCESS_RESET_MS;

const styles = StyleSheet.create({
  card: {
    padding: spacing.screen,
    gap: spacing.xl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xl,
  },
  productText: {
    flex: 1,
    gap: spacing.xxs,
  },
  totalBadge: {
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    minWidth: 88,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  macroPill: {
    flex: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-end',
  },
  gramsField: {
    flex: 1,
    gap: spacing.xs,
  },
  gramsInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  gramsInput: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    fontSize: 14,
    color: colors.text,
    fontFamily: typography.body.fontFamily,
  },
  gramsUnit: {
    ...typography.caption,
    paddingRight: spacing.xl,
  },
  mealDropdown: {
    position: 'relative',
  },
  mealTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radii.round,
  },
  mealDot: {
    width: 8,
    height: 8,
    borderRadius: radii.round,
  },
  mealMenu: {
    position: 'absolute',
    bottom: '100%',
    right: 0,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    minWidth: 160,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 10,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryBtn: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeText: {
    textAlign: 'center',
  },
});

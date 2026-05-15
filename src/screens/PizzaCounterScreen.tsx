import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { PizzaHoldButton } from '@/components/PizzaHoldButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { YearPickerSheet } from '@/components/YearPickerSheet';
import { pizzaLogDB } from '@/database';
import { colors, spacing, typography } from '@/theme';

// Easter egg: conta pizze annuale, raggiungibile via long-press del tab
// "Storico" in modalità diet. Mostra il totale dell'anno selezionato (default
// anno corrente) e permette di aggiungere una pizza tenendo premuta la
// pizza disegnata. Le pizze vengono sempre registrate con la data del
// momento (anno corrente): se l'utente sta guardando un anno passato, dopo
// l'add la vista torna automaticamente all'anno corrente.

export default function PizzaCounterScreen() {
  const insets = useSafeAreaInsets();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [count, setCount] = useState(0);
  const [yearsAvailable, setYearsAvailable] = useState<number[]>([currentYear]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const refresh = useCallback(
    async (targetYear: number) => {
      const [nextCount, years] = await Promise.all([
        pizzaLogDB.getCountForYear(targetYear),
        pizzaLogDB.getYearsWithPizzas(),
      ]);
      setCount(nextCount);
      // Garantisce l'anno corrente sempre presente in cima alla lista, anche
      // se non ha ancora pizze. Anni duplicati eliminati col Set.
      const merged = Array.from(new Set([currentYear, ...years])).sort(
        (a, b) => b - a,
      );
      setYearsAvailable(merged);
    },
    [currentYear],
  );

  useFocusEffect(
    useCallback(() => {
      void refresh(year);
    }, [refresh, year]),
  );

  useEffect(() => {
    void refresh(year);
  }, [refresh, year]);

  const handleAddPizza = useCallback(async () => {
    await pizzaLogDB.addPizza();
    // Forziamo la vista sull'anno corrente (dove la pizza è stata salvata).
    // Se l'utente stava guardando un anno passato, lo riportiamo al presente.
    if (year !== currentYear) {
      setYear(currentYear);
    } else {
      void refresh(currentYear);
    }
  }, [year, currentYear, refresh]);

  const handleSelectYear = (next: number) => {
    setPickerOpen(false);
    setYear(next);
  };

  // Chevron ±1 nella lista anni disponibili. Disabilitati se non c'è anno
  // precedente/successivo nei dati. Per "successivo" includiamo solo anni
  // ≤ corrente (non ha senso navigare nel futuro).
  const sortedAsc = [...yearsAvailable].sort((a, b) => a - b);
  const currentIdx = sortedAsc.indexOf(year);
  const prevYear = currentIdx > 0 ? sortedAsc[currentIdx - 1] : null;
  const nextYear =
    currentIdx >= 0 && currentIdx < sortedAsc.length - 1
      ? sortedAsc[currentIdx + 1]
      : null;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Conta pizze" subtitle="Easter egg" />

      <View style={styles.content}>
        <View style={styles.yearRow}>
          <Pressable
            onPress={() => prevYear !== null && setYear(prevYear)}
            disabled={prevYear === null}
            style={({ pressed }) => [
              styles.chevronBtn,
              prevYear === null ? styles.chevronDisabled : null,
              pressed && prevYear !== null ? styles.chevronPressed : null,
            ]}
            hitSlop={12}
          >
            <Icon
              name="chevron-left"
              size={24}
              color={prevYear === null ? colors.border : colors.textSec}
            />
          </Pressable>
          <Pressable onPress={() => setPickerOpen(true)} hitSlop={12}>
            <Text style={styles.yearText}>{year}</Text>
          </Pressable>
          <Pressable
            onPress={() => nextYear !== null && setYear(nextYear)}
            disabled={nextYear === null}
            style={({ pressed }) => [
              styles.chevronBtn,
              nextYear === null ? styles.chevronDisabled : null,
              pressed && nextYear !== null ? styles.chevronPressed : null,
            ]}
            hitSlop={12}
          >
            <Icon
              name="chevron-right"
              size={24}
              color={nextYear === null ? colors.border : colors.textSec}
            />
          </Pressable>
        </View>

        <Text style={styles.bigNumber}>{count}</Text>
        <Text style={styles.subtitle}>
          {year === currentYear
            ? 'pizze mangiate fino ad ora'
            : `pizze mangiate nel ${year}`}
        </Text>

        <View style={styles.pizzaWrapper}>
          <PizzaHoldButton onComplete={handleAddPizza} />
        </View>

        <Text style={styles.hint}>Tieni premuto per aggiungere</Text>
      </View>

      <YearPickerSheet
        visible={pickerOpen}
        years={yearsAvailable}
        selectedYear={year}
        onSelect={handleSelectYear}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.xxxl,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxl,
    marginBottom: spacing.xxl,
  },
  chevronBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  chevronDisabled: {
    opacity: 0.4,
  },
  chevronPressed: {
    backgroundColor: colors.border,
  },
  yearText: {
    ...typography.h1,
    fontSize: 24,
    color: colors.text,
  },
  bigNumber: {
    ...typography.display,
    fontSize: 96,
    lineHeight: 104,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSec,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xxxl,
  },
  pizzaWrapper: {
    marginTop: spacing.lg,
  },
  hint: {
    ...typography.caption,
    color: colors.textSec,
    marginTop: spacing.xxl,
  },
});

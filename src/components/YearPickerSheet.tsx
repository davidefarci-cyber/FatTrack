import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { colors, radii, spacing, typography } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';

// Picker anno per il conta pizze. Mostra l'elenco di anni passati in input
// (corrente sempre garantito dal chiamante), tap su un anno → onSelect + close.

type Props = {
  visible: boolean;
  years: number[];
  selectedYear: number;
  onSelect: (year: number) => void;
  onClose: () => void;
};

export function YearPickerSheet({
  visible,
  years,
  selectedYear,
  onSelect,
  onClose,
}: Props) {
  const { accent } = useAppTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightPercent={60}>
      <Text style={styles.title}>Scegli anno</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {years.map((year) => {
          const isSelected = year === selectedYear;
          return (
            <Pressable
              key={year}
              onPress={() => onSelect(year)}
              style={[
                styles.row,
                isSelected ? { backgroundColor: accent } : null,
              ]}
            >
              <Text
                style={[
                  styles.rowText,
                  isSelected ? styles.rowTextSelected : null,
                ]}
              >
                {year}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.h1,
    marginBottom: spacing.xl,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  row: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.lg,
    backgroundColor: colors.bg,
    alignItems: 'center',
  },
  rowText: {
    ...typography.value,
    color: colors.text,
  },
  rowTextSelected: {
    color: '#FFFFFF',
  },
});

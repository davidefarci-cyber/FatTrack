import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Icon } from '@/components/Icon';
import type { Workout } from '@/database';
import { colors, radii, spacing, sportPalette, typography } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';

// Sub-modal usato dalla SportHomeScreen "Cambia scheda di oggi": lista
// scrollabile delle schede disponibili (preset + utente). Tap → callback
// `onPick(workoutId)` e chiude. La selezione è LOCALE alla Home (non
// persistita in DB): al cold start torna alla logica "ultima usata".

type Props = {
  visible: boolean;
  workouts: Workout[];
  selectedId: number | null;
  onPick: (workoutId: number) => void;
  onClose: () => void;
};

export function WorkoutPickerSheet({
  visible,
  workouts,
  selectedId,
  onPick,
  onClose,
}: Props) {
  const theme = useAppTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightPercent={75}>
      <View style={styles.header}>
        <Text style={typography.h1}>Cambia scheda</Text>
        <Text style={typography.caption}>
          Seleziona una scheda per la sessione di oggi.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {workouts.length === 0 ? (
          <Text style={[typography.caption, styles.empty]}>
            Nessuna scheda disponibile.
          </Text>
        ) : (
          workouts.map((w, idx) => {
            const palette = sportPalette[w.category];
            const isSelected = selectedId === w.id;
            return (
              <Pressable
                key={w.id}
                onPress={() => onPick(w.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Scegli ${w.name}`}
                style={({ pressed }) => [
                  styles.row,
                  idx < workouts.length - 1 && styles.rowDivider,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: palette.bg, borderColor: palette.color },
                  ]}
                />
                <View style={styles.rowText}>
                  <Text style={typography.body} numberOfLines={1}>
                    {w.name}
                  </Text>
                  <Text style={typography.caption} numberOfLines={1}>
                    {palette.label} · {w.exercises.length}{' '}
                    {w.exercises.length === 1 ? 'esercizio' : 'esercizi'}
                    {w.estimatedDurationMin !== null
                      ? ` · ${w.estimatedDurationMin} min`
                      : ''}
                  </Text>
                </View>
                {isSelected ? (
                  <Icon name="check" size={16} color={theme.accent} />
                ) : (
                  <Icon
                    name="chevron-right"
                    size={14}
                    color={colors.textSec}
                  />
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xxs,
    paddingBottom: spacing.lg,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  empty: {
    paddingVertical: spacing.xl,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pressed: {
    opacity: 0.85,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: radii.round,
    borderWidth: 2,
  },
  rowText: {
    flex: 1,
    gap: spacing.xxs,
  },
});

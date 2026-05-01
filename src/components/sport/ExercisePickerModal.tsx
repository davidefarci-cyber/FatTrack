import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/Input';
import { exercisesDB } from '@/database';
import type { Exercise } from '@/database';
import { colors, spacing, typography } from '@/theme';

// Sub-modal di selezione esercizio dalla libreria. Lista filtrabile per
// nome (case-insensitive). Tap → callback `onPick(exerciseId)` e chiude.
// La libreria completa con filtri muscolo/livello arriverà in Fase 4: qui
// teniamo il picker volutamente semplice.

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (exerciseId: number) => void;
};

export function ExercisePickerModal({ visible, onClose, onPick }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    let active = true;
    exercisesDB
      .getAllExercises()
      .then((rows) => {
        if (active) setExercises(rows);
      })
      .catch(() => {
        if (active) setExercises([]);
      });
    return () => {
      active = false;
    };
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter(
      (ex) =>
        ex.name.toLowerCase().includes(q) ||
        ex.muscleGroup.toLowerCase().includes(q),
    );
  }, [exercises, query]);

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightPercent={75}>
      <View style={styles.header}>
        <Text style={typography.h1}>Aggiungi esercizio</Text>
        <Text style={typography.caption}>
          Scegli dalla libreria base. Altri ne arriveranno presto.
        </Text>
      </View>

      <Input
        placeholder="Cerca per nome o muscolo"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <Text style={[typography.caption, styles.empty]}>
            Nessun esercizio trovato.
          </Text>
        ) : (
          filtered.map((ex, idx) => (
            <Pressable
              key={ex.id}
              onPress={() => {
                onPick(ex.id);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel={`Aggiungi ${ex.name}`}
              style={[
                styles.row,
                idx < filtered.length - 1 && styles.rowDivider,
              ]}
            >
              <View style={styles.rowText}>
                <Text style={typography.body} numberOfLines={1}>
                  {ex.name}
                </Text>
                <Text style={typography.caption} numberOfLines={1}>
                  {ex.muscleGroup} · {ex.level}
                </Text>
              </View>
              <Icon name="plus" size={14} color={colors.textSec} />
            </Pressable>
          ))
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
  rowText: {
    flex: 1,
    gap: spacing.xxs,
  },
});

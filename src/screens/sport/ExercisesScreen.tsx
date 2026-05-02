import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/Input';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ExerciseDetailModal } from '@/components/sport/ExerciseDetailModal';
import { exercisesDB } from '@/database';
import type { Exercise, ExerciseLevel } from '@/database';
import { colors, radii, spacing, typography } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import {
  exerciseCountLabel,
  groupByMuscle,
} from '@/utils/exerciseGrouping';

// Libreria esercizi con search live (debounce 250ms) + filtri
// (gruppo muscolare / livello / attrezzatura) raccolti in un BottomSheet
// "Filtri" — più compatto di tre SegmentedControl orizzontali e meno
// rumoroso visivamente. Le opzioni di gruppo/attrezzatura sono derivate
// a runtime via DISTINCT così seguono l'evolversi del seed senza
// hardcode da aggiornare.

const SEARCH_DEBOUNCE_MS = 250;

const LEVEL_OPTIONS: ReadonlyArray<{ value: ExerciseLevel; label: string }> = [
  { value: 'principiante', label: 'Principiante' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzato', label: 'Avanzato' },
];

type Filters = {
  muscleGroup: string | null;
  level: ExerciseLevel | null;
  equipment: string | null;
};

const EMPTY_FILTERS: Filters = {
  muscleGroup: null,
  level: null,
  equipment: null,
};

export default function ExercisesScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openExercise, setOpenExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    let active = true;
    exercisesDB
      .getAllExercises()
      .then((rows) => {
        if (active) setExercises(rows);
      })
      .catch(() => {
        if (active) setExercises([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  const muscleGroupOptions = useMemo(() => {
    const set = new Set<string>();
    for (const ex of exercises) set.add(ex.muscleGroup);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'it'));
  }, [exercises]);

  const equipmentOptions = useMemo(() => {
    const set = new Set<string>();
    for (const ex of exercises) set.add(ex.equipment);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'it'));
  }, [exercises]);

  const activeFiltersCount =
    (filters.muscleGroup !== null ? 1 : 0) +
    (filters.level !== null ? 1 : 0) +
    (filters.equipment !== null ? 1 : 0);

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      if (debouncedQuery) {
        const haystack = `${ex.name} ${ex.muscleGroup}`.toLowerCase();
        if (!haystack.includes(debouncedQuery)) return false;
      }
      if (filters.muscleGroup && ex.muscleGroup !== filters.muscleGroup)
        return false;
      if (filters.level && ex.level !== filters.level) return false;
      if (filters.equipment && ex.equipment !== filters.equipment) return false;
      return true;
    });
  }, [exercises, debouncedQuery, filters]);

  const sections = useMemo(() => groupByMuscle(filtered), [filtered]);

  const renderItem = useCallback(
    ({ item }: { item: Exercise }) => (
      <Pressable
        onPress={() => setOpenExercise(item)}
        accessibilityRole="button"
        accessibilityLabel={`Apri dettaglio ${item.name}`}
      >
        <Card style={styles.row}>
          <View style={styles.rowText}>
            <Text style={typography.body} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={typography.caption} numberOfLines={1}>
              {item.muscleGroup} · {item.equipment} · {item.level}
            </Text>
          </View>
          <Icon name="chevron-right" size={14} color={colors.textSec} />
        </Card>
      </Pressable>
    ),
    [],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string; count: number } }) => (
      <View style={styles.sectionHeader}>
        <Text style={[typography.label, styles.sectionTitle]}>
          {section.title}
        </Text>
        <Text style={[typography.caption, styles.sectionCount]}>
          {exerciseCountLabel(section.count)}
        </Text>
      </View>
    ),
    [],
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Esercizi"
        subtitle="Libreria + guida"
        style={{ paddingTop: insets.top + spacing.xl }}
      />

      <View style={styles.controls}>
        <Input
          placeholder="Cerca esercizio…"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          containerStyle={styles.searchInput}
        />
        <Pressable
          onPress={() => setFiltersOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Apri filtri"
          style={({ pressed }) => [
            styles.filtersBtn,
            activeFiltersCount > 0 && {
              borderColor: theme.accent,
              backgroundColor: theme.accentSoft,
            },
            pressed && styles.pressed,
          ]}
        >
          <Icon
            name="list-checks"
            size={16}
            color={activeFiltersCount > 0 ? theme.accentDark : colors.textSec}
          />
          <Text
            style={[
              typography.bodyBold,
              {
                color:
                  activeFiltersCount > 0 ? theme.accentDark : colors.textSec,
              },
            ]}
          >
            {activeFiltersCount > 0
              ? `Filtri (${activeFiltersCount})`
              : 'Filtri'}
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.scroll}>
          <Card style={styles.placeholder}>
            <ActivityIndicator color={colors.textSec} />
          </Card>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.scroll}>
          <Card style={styles.placeholder}>
            <Text style={typography.body}>Nessun esercizio</Text>
            <Text style={typography.caption}>
              Nessun esercizio trovato per i filtri attuali.
            </Text>
          </Card>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + spacing.screen * 4 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}

      <ExerciseDetailModal
        visible={openExercise !== null}
        exercise={openExercise}
        onClose={() => setOpenExercise(null)}
      />

      <FiltersSheet
        visible={filtersOpen}
        filters={filters}
        muscleGroups={muscleGroupOptions}
        equipments={equipmentOptions}
        onApply={(next) => {
          setFilters(next);
          setFiltersOpen(false);
        }}
        onClose={() => setFiltersOpen(false)}
      />
    </View>
  );
}

type FiltersSheetProps = {
  visible: boolean;
  filters: Filters;
  muscleGroups: string[];
  equipments: string[];
  onApply: (filters: Filters) => void;
  onClose: () => void;
};

function FiltersSheet({
  visible,
  filters,
  muscleGroups,
  equipments,
  onApply,
  onClose,
}: FiltersSheetProps) {
  const [draft, setDraft] = useState<Filters>(filters);

  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightPercent={85}>
      <ScrollView
        contentContainerStyle={styles.filtersScroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={typography.h1}>Filtri</Text>

        <FilterGroup
          label="Gruppo muscolare"
          options={muscleGroups.map((g) => ({ value: g, label: g }))}
          value={draft.muscleGroup}
          onChange={(value) => setDraft((d) => ({ ...d, muscleGroup: value }))}
        />

        <FilterGroup
          label="Livello"
          options={LEVEL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          value={draft.level}
          onChange={(value) =>
            setDraft((d) => ({ ...d, level: value as ExerciseLevel | null }))
          }
        />

        <FilterGroup
          label="Attrezzatura"
          options={equipments.map((e) => ({ value: e, label: e }))}
          value={draft.equipment}
          onChange={(value) => setDraft((d) => ({ ...d, equipment: value }))}
        />

        <View style={styles.filtersFooter}>
          <Button
            label="Reset"
            variant="secondary"
            onPress={() => setDraft(EMPTY_FILTERS)}
            style={styles.filtersFooterBtn}
          />
          <Button
            label="Applica"
            onPress={() => onApply(draft)}
            style={styles.filtersFooterBtn}
          />
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

type FilterGroupProps<T extends string> = {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T | null;
  onChange: (next: T | null) => void;
};

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: FilterGroupProps<T>) {
  const theme = useAppTheme();
  return (
    <View style={styles.filterGroup}>
      <Text style={typography.label}>{label}</Text>
      <View style={styles.chipsWrap}>
        <Chip
          label="Tutti"
          active={value === null}
          accent={theme.accent}
          accentDark={theme.accentDark}
          accentSoft={theme.accentSoft}
          onPress={() => onChange(null)}
        />
        {options.map((opt) => (
          <Chip
            key={String(opt.value)}
            label={opt.label}
            active={value === opt.value}
            accent={theme.accent}
            accentDark={theme.accentDark}
            accentSoft={theme.accentSoft}
            onPress={() => onChange(opt.value)}
          />
        ))}
      </View>
    </View>
  );
}

type ChipProps = {
  label: string;
  active: boolean;
  accent: string;
  accentDark: string;
  accentSoft: string;
  onPress: () => void;
};

function Chip({ label, active, accent, accentDark, accentSoft, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        active && {
          backgroundColor: accentSoft,
          borderColor: accent,
        },
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          typography.bodyBold,
          { color: active ? accentDark : colors.textSec },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.xl,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  filtersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pressed: {
    opacity: 0.85,
  },
  scroll: {
    padding: spacing.screen,
  },
  placeholder: {
    padding: spacing.screen,
    gap: spacing.sm,
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
  },
  sectionCount: {
    color: colors.textSec,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: spacing.xxs,
  },
  filtersScroll: {
    paddingBottom: spacing.screen,
    gap: spacing.xl,
  },
  filterGroup: {
    gap: spacing.md,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.round,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filtersFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  filtersFooterBtn: {
    flex: 1,
  },
});

import { useState } from 'react';
import { Controller, useForm, type SubmitHandler } from 'react-hook-form';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { OptionSelect } from '@/components/OptionSelect';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import type { ActivityLevel, Gender } from '@/database';
import { useProfile } from '@/hooks/useProfile';
import { colors, radii, spacing, typography } from '@/theme';
import {
  calculateBMR,
  calculateTDEE,
  calculateTarget,
} from '@/utils/calorieCalculator';
import {
  ACTIVITY_OPTIONS,
  GENDER_OPTIONS,
  WEEKLY_GOAL_OPTIONS,
} from '@/utils/profileOptions';

type FormValues = {
  weightKg: string;
  heightCm: string;
  age: string;
  gender: Gender | null;
  activityLevel: ActivityLevel | null;
  weeklyGoalKg: number | null;
};

type ComputedValues = {
  bmr: number;
  tdee: number;
  target: number;
};

const DEFAULT_VALUES: FormValues = {
  weightKg: '',
  heightCm: '',
  age: '',
  gender: null,
  activityLevel: null,
  weeklyGoalKg: null,
};

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { saveProfile } = useProfile();
  const [computed, setComputed] = useState<ComputedValues | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: DEFAULT_VALUES,
    mode: 'onChange',
  });

  const handleCalculate: SubmitHandler<FormValues> = (values) => {
    const parsed = parseFormValues(values);
    if (!parsed) return;
    const bmr = calculateBMR(parsed.weightKg, parsed.heightCm, parsed.age, parsed.gender);
    const tdee = calculateTDEE(bmr, parsed.activityLevel);
    const target = calculateTarget(tdee, parsed.weeklyGoalKg);
    setComputed({ bmr, tdee, target });
  };

  const handleSave: SubmitHandler<FormValues> = async (values) => {
    const parsed = parseFormValues(values);
    if (!parsed) return;
    setSaving(true);
    try {
      // saveProfile aggiorna lo stato condiviso: RootNavigator si accorgerà
      // del nuovo profilo e passerà automaticamente al MainTabNavigator.
      await saveProfile(parsed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Benvenuto in FatTrack"
        subtitle="Imposta il tuo profilo per calcolare l'obiettivo calorico"
        style={{ paddingTop: insets.top + spacing.xl }}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.screen * 2 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.card}>
          <Text style={typography.label}>Dati personali</Text>

          <Controller
            control={control}
            name="weightKg"
            rules={{
              required: 'Inserisci il peso',
              validate: (v) => validateNumber(v, 20, 400) || 'Peso non valido (20-400)',
            }}
            render={({ field: { value, onChange, onBlur } }) => (
              <FormField error={errors.weightKg?.message}>
                <Input
                  label="Peso"
                  unit="kg"
                  keyboardType="decimal-pad"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="70"
                />
              </FormField>
            )}
          />

          <Controller
            control={control}
            name="heightCm"
            rules={{
              required: 'Inserisci l\u2019altezza',
              validate: (v) => validateNumber(v, 100, 250) || 'Altezza non valida (100-250)',
            }}
            render={({ field: { value, onChange, onBlur } }) => (
              <FormField error={errors.heightCm?.message}>
                <Input
                  label="Altezza"
                  unit="cm"
                  keyboardType="number-pad"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="175"
                />
              </FormField>
            )}
          />

          <Controller
            control={control}
            name="age"
            rules={{
              required: 'Inserisci l\u2019et\u00e0',
              validate: (v) => validateInteger(v, 10, 120) || 'Et\u00e0 non valida (10-120)',
            }}
            render={({ field: { value, onChange, onBlur } }) => (
              <FormField error={errors.age?.message}>
                <Input
                  label="Et\u00e0"
                  unit="anni"
                  keyboardType="number-pad"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="30"
                />
              </FormField>
            )}
          />

          <Controller
            control={control}
            name="gender"
            rules={{ required: 'Seleziona il sesso' }}
            render={({ field: { value, onChange } }) => (
              <FormField label="Sesso" error={errors.gender?.message}>
                <SegmentedControl
                  options={GENDER_OPTIONS}
                  value={value}
                  onChange={onChange}
                />
              </FormField>
            )}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={typography.label}>Livello di attivit\u00e0</Text>
          <Controller
            control={control}
            name="activityLevel"
            rules={{ required: 'Seleziona il livello di attivit\u00e0' }}
            render={({ field: { value, onChange } }) => (
              <FormField error={errors.activityLevel?.message}>
                <OptionSelect
                  options={ACTIVITY_OPTIONS}
                  value={value}
                  onChange={onChange}
                />
              </FormField>
            )}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={typography.label}>Obiettivo settimanale</Text>
          <Controller
            control={control}
            name="weeklyGoalKg"
            rules={{ required: 'Seleziona un obiettivo' }}
            render={({ field: { value, onChange } }) => (
              <FormField error={errors.weeklyGoalKg?.message}>
                <OptionSelect
                  options={WEEKLY_GOAL_OPTIONS}
                  value={value}
                  onChange={onChange}
                />
              </FormField>
            )}
          />
        </Card>

        {computed ? <ResultsCard values={computed} /> : null}

        <View style={styles.actions}>
          <Button
            label="Calcola"
            variant="secondary"
            onPress={handleSubmit(handleCalculate)}
          />
          <Button
            label="Salva e inizia"
            onPress={handleSubmit(handleSave)}
            loading={saving}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function ResultsCard({ values }: { values: ComputedValues }) {
  return (
    <Card style={styles.resultsCard}>
      <Text style={typography.label}>Riepilogo calorico</Text>
      <View style={styles.resultsGrid}>
        <ResultRow label="BMR" value={`${Math.round(values.bmr)} kcal`} />
        <ResultRow label="TDEE" value={`${Math.round(values.tdee)} kcal`} />
        <ResultRow
          label="Calorie target"
          value={`${Math.round(values.target)} kcal`}
          highlight
        />
      </View>
    </Card>
  );
}

function ResultRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.resultRow}>
      <Text style={typography.caption}>{label}</Text>
      <Text
        style={[
          typography.value,
          highlight && { color: colors.green },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function FormField({
  children,
  label,
  error,
}: {
  children: React.ReactNode;
  label?: string;
  error?: string;
}) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      {children}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function validateNumber(raw: string, min: number, max: number): boolean {
  const n = Number(String(raw).replace(',', '.'));
  return Number.isFinite(n) && n >= min && n <= max;
}

function validateInteger(raw: string, min: number, max: number): boolean {
  const n = Number(raw);
  return Number.isInteger(n) && n >= min && n <= max;
}

type ParsedProfile = {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  weeklyGoalKg: number;
};

function parseFormValues(values: FormValues): ParsedProfile | null {
  const weightKg = Number(String(values.weightKg).replace(',', '.'));
  const heightCm = Number(String(values.heightCm).replace(',', '.'));
  const age = Number(values.age);
  if (
    !Number.isFinite(weightKg) ||
    !Number.isFinite(heightCm) ||
    !Number.isInteger(age) ||
    values.gender === null ||
    values.activityLevel === null ||
    values.weeklyGoalKg === null
  ) {
    return null;
  }
  return {
    weightKg,
    heightCm,
    age,
    gender: values.gender,
    activityLevel: values.activityLevel,
    weeklyGoalKg: values.weeklyGoalKg,
  };
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
  card: {
    padding: spacing.screen,
    gap: spacing.xl,
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.red,
  },
  actions: {
    gap: spacing.xl,
  },
  resultsCard: {
    padding: spacing.screen,
    gap: spacing.xl,
    borderRadius: radii.xxl,
  },
  resultsGrid: {
    gap: spacing.lg,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

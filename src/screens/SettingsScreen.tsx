import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { OptionSelect } from '@/components/OptionSelect';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { settingsDB } from '@/database';
import type { ActivityLevel, DailySettings, Gender, UserProfile } from '@/database';
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

const AUTOSAVE_DEBOUNCE_MS = 600;
const DEFAULT_SIDE_DISH_KCAL = 50;

type FormValues = {
  weightKg: string;
  heightCm: string;
  age: string;
  gender: Gender | null;
  activityLevel: ActivityLevel | null;
  weeklyGoalKg: number | null;
  sideDishCalories: string;
};

type ParsedProfile = {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  weeklyGoalKg: number;
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { profile, saveProfile, loading: profileLoading } = useProfile();
  const [settings, setSettings] = useState<DailySettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    settingsDB
      .getSettings()
      .then(setSettings)
      .finally(() => setSettingsLoading(false));
  }, []);

  const {
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: emptyValues(),
    mode: 'onChange',
  });

  // Allinea il form ai dati appena caricati (profilo + impostazioni).
  // Senza questo reset l'Input partirebbe con stringhe vuote anche quando
  // in DB esistono i valori.
  useEffect(() => {
    if (profileLoading || settingsLoading) return;
    reset(buildFormValues(profile, settings));
  }, [profile, settings, profileLoading, settingsLoading, reset]);

  const watched = useWatch({ control }) as FormValues;
  const parsed = useMemo(() => parseProfile(watched), [watched]);
  const sideKcal = useMemo(() => parseSideKcal(watched.sideDishCalories), [
    watched.sideDishCalories,
  ]);
  const computed = useMemo(() => (parsed ? computeProfile(parsed) : null), [parsed]);

  // Salvataggio automatico del profilo: debounce per non scrivere a ogni tasto.
  const lastSavedProfileRef = useRef<ParsedProfile | null>(null);
  useEffect(() => {
    if (profileLoading || !profile || !parsed) return;
    if (sameProfile(parsed, lastSavedProfileRef.current ?? profile)) return;
    const handle = setTimeout(() => {
      saveProfile(parsed)
        .then(() => {
          lastSavedProfileRef.current = parsed;
        })
        .catch(() => undefined);
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [parsed, profile, profileLoading, saveProfile]);

  // Salvataggio automatico delle calorie contorno (settings separate dal profilo).
  const lastSavedSideRef = useRef<number | null>(null);
  useEffect(() => {
    if (settingsLoading || !settings || sideKcal === null) return;
    const baseline = lastSavedSideRef.current ?? settings.sideDishCalories;
    if (sideKcal === baseline) return;
    const handle = setTimeout(() => {
      settingsDB
        .updateSettings({ sideDishCalories: sideKcal })
        .then((next) => {
          lastSavedSideRef.current = sideKcal;
          setSettings(next);
        })
        .catch(() => undefined);
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [sideKcal, settings, settingsLoading]);

  const loading = profileLoading || settingsLoading;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Impostazioni"
        subtitle="Aggiorna i tuoi dati: il salvataggio \u00e8 automatico"
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
        {loading ? (
          <Card style={styles.card}>
            <Text style={typography.body}>Caricamento\u2026</Text>
          </Card>
        ) : (
          <>
            <ResultsCard computed={computed} />

            <Card style={styles.card}>
              <Text style={typography.label}>Dati personali</Text>

              <Controller
                control={control}
                name="weightKg"
                rules={{
                  required: 'Inserisci il peso',
                  validate: (v) => validateNumber(v, 20, 400) || 'Peso non valido',
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
                    />
                  </FormField>
                )}
              />

              <Controller
                control={control}
                name="heightCm"
                rules={{
                  required: 'Inserisci l\u2019altezza',
                  validate: (v) => validateNumber(v, 100, 250) || 'Altezza non valida',
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
                    />
                  </FormField>
                )}
              />

              <Controller
                control={control}
                name="age"
                rules={{
                  required: 'Inserisci l\u2019et\u00e0',
                  validate: (v) => validateInteger(v, 10, 120) || 'Et\u00e0 non valida',
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

            <Card style={styles.card}>
              <Text style={typography.label}>Extra</Text>
              <Controller
                control={control}
                name="sideDishCalories"
                rules={{
                  required: 'Inserisci le calorie',
                  validate: (v) => validateNumber(v, 0, 2000) || 'Valore non valido',
                }}
                render={({ field: { value, onChange, onBlur } }) => (
                  <FormField
                    error={errors.sideDishCalories?.message}
                    hint="Calorie aggiunte in automatico ad ogni pasto (es. olio, condimenti)."
                  >
                    <Input
                      label="Calorie fisse contorno"
                      unit="kcal"
                      keyboardType="number-pad"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                    />
                  </FormField>
                )}
              />
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ResultsCard({ computed }: { computed: ReturnType<typeof computeProfile> | null }) {
  return (
    <Card style={styles.resultsCard}>
      <Text style={typography.label}>Riepilogo calorico</Text>
      <View style={styles.resultsGrid}>
        <ResultRow
          label="BMR"
          value={computed ? `${Math.round(computed.bmr)} kcal` : '\u2014'}
        />
        <ResultRow
          label="TDEE"
          value={computed ? `${Math.round(computed.tdee)} kcal` : '\u2014'}
        />
        <ResultRow
          label="Calorie target"
          value={computed ? `${Math.round(computed.target)} kcal` : '\u2014'}
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
      <Text style={[typography.value, highlight && { color: colors.green }]}>{value}</Text>
    </View>
  );
}

function FormField({
  children,
  label,
  error,
  hint,
}: {
  children: React.ReactNode;
  label?: string;
  error?: string;
  hint?: string;
}) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      {children}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {hint && !error ? <Text style={styles.hintText}>{hint}</Text> : null}
    </View>
  );
}

function emptyValues(): FormValues {
  return {
    weightKg: '',
    heightCm: '',
    age: '',
    gender: null,
    activityLevel: null,
    weeklyGoalKg: null,
    sideDishCalories: String(DEFAULT_SIDE_DISH_KCAL),
  };
}

function buildFormValues(
  profile: UserProfile | null,
  settings: DailySettings | null,
): FormValues {
  const side = settings?.sideDishCalories ?? DEFAULT_SIDE_DISH_KCAL;
  if (!profile) {
    return { ...emptyValues(), sideDishCalories: String(side) };
  }
  return {
    weightKg: String(profile.weightKg),
    heightCm: String(profile.heightCm),
    age: String(profile.age),
    gender: profile.gender,
    activityLevel: profile.activityLevel,
    weeklyGoalKg: profile.weeklyGoalKg,
    sideDishCalories: String(side),
  };
}

function computeProfile(p: ParsedProfile) {
  const bmr = calculateBMR(p.weightKg, p.heightCm, p.age, p.gender);
  const tdee = calculateTDEE(bmr, p.activityLevel);
  const target = calculateTarget(tdee, p.weeklyGoalKg);
  return { bmr, tdee, target };
}

function parseProfile(v: FormValues): ParsedProfile | null {
  const weightKg = Number(String(v.weightKg).replace(',', '.'));
  const heightCm = Number(String(v.heightCm).replace(',', '.'));
  const age = Number(v.age);
  if (
    !Number.isFinite(weightKg) ||
    !Number.isFinite(heightCm) ||
    !Number.isInteger(age) ||
    v.gender === null ||
    v.activityLevel === null ||
    v.weeklyGoalKg === null
  ) {
    return null;
  }
  if (weightKg < 20 || weightKg > 400) return null;
  if (heightCm < 100 || heightCm > 250) return null;
  if (age < 10 || age > 120) return null;
  return {
    weightKg,
    heightCm,
    age,
    gender: v.gender,
    activityLevel: v.activityLevel,
    weeklyGoalKg: v.weeklyGoalKg,
  };
}

function parseSideKcal(raw: string): number | null {
  const n = Number(String(raw).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > 2000) return null;
  return n;
}

function sameProfile(a: ParsedProfile, b: Pick<UserProfile, keyof ParsedProfile>): boolean {
  return (
    a.weightKg === b.weightKg &&
    a.heightCm === b.heightCm &&
    a.age === b.age &&
    a.gender === b.gender &&
    a.activityLevel === b.activityLevel &&
    a.weeklyGoalKg === b.weeklyGoalKg
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
  hintText: {
    ...typography.caption,
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

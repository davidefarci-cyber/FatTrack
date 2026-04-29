import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InfoTooltip } from '@/components/InfoTooltip';
import { Input } from '@/components/Input';
import { OptionSelect } from '@/components/OptionSelect';
import { QuickAddonsCard } from '@/components/QuickAddonsCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useToast } from '@/components/Toast';
import { mealsStore, resetDatabase } from '@/database';
import type { ActivityLevel, Gender, UserProfile } from '@/database';
import { useProfile } from '@/hooks/useProfile';
import { colors, radii, spacing, typography } from '@/theme';
import {
  calculateBMR,
  calculateTDEE,
  calculateTarget,
} from '@/utils/calorieCalculator';
import { PROFILE_EXPLAINERS } from '@/utils/profileExplainers';
import type { ProfileExplainerKey } from '@/utils/profileExplainers';
import {
  ACTIVITY_OPTIONS,
  GENDER_OPTIONS,
  WEEKLY_GOAL_OPTIONS,
} from '@/utils/profileOptions';

const AUTOSAVE_DEBOUNCE_MS = 600;

type FormValues = {
  weightKg: string;
  heightCm: string;
  age: string;
  gender: Gender | null;
  activityLevel: ActivityLevel | null;
  weeklyGoalKg: number | null;
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
  const toast = useToast();
  const { profile, saveProfile, deleteProfile, reload: reloadProfile, loading: profileLoading } = useProfile();
  const [resetting, setResetting] = useState(false);
  const [resettingDb, setResettingDb] = useState(false);

  const {
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: emptyValues(),
    mode: 'onChange',
  });

  // Allinea il form al profilo appena caricato. Senza questo reset l'Input
  // partirebbe con stringhe vuote anche quando in DB esistono i valori.
  useEffect(() => {
    if (profileLoading) return;
    reset(buildFormValues(profile));
  }, [profile, profileLoading, reset]);

  const watched = useWatch({ control }) as FormValues;
  const parsed = useMemo(() => parseProfile(watched), [watched]);
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

  const loading = profileLoading;

  const handleReset = () => {
    Alert.alert(
      'Reset app',
      'Verrà cancellato il profilo e tornerai all’onboarding. I pasti e i preferiti restano nel database. Vuoi procedere?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            try {
              await deleteProfile();
              toast.show('App resettata');
            } finally {
              setResetting(false);
            }
          },
        },
      ],
    );
  };

  const handleResetDb = () => {
    Alert.alert(
      'Reset completo del database',
      'Cancella tutto: profilo, pasti, preferiti, aggiunte rapide. Il DB ripartira’ da zero (food default + aggiunte rapide riseminate). Vuoi procedere?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Cancella tutto',
          style: 'destructive',
          onPress: async () => {
            setResettingDb(true);
            try {
              await resetDatabase();
              // La cache in-memory dello store dei pasti sopravvive al drop
              // delle tabelle: la svuotiamo a mano per evitare di mostrare
              // pasti fantasma dalle date gia' visitate.
              mealsStore.clearCache();
              // Aggiorna la snapshot del profilo: ora e' null (tabella vuota)
              // e il RootNavigator passa automaticamente all'OnboardingScreen.
              await reloadProfile();
              toast.show('Database resettato');
            } finally {
              setResettingDb(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Impostazioni"
        subtitle="Aggiorna i tuoi dati: il salvataggio è automatico"
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
            <Text style={typography.body}>Caricamento…</Text>
          </Card>
        ) : (
          <>
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
                  required: 'Inserisci l’altezza',
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
                  required: 'Inserisci l’età',
                  validate: (v) => validateInteger(v, 10, 120) || 'Età non valida',
                }}
                render={({ field: { value, onChange, onBlur } }) => (
                  <FormField error={errors.age?.message}>
                    <Input
                      label="Età"
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
              <Text style={typography.label}>Livello di attività</Text>
              <Controller
                control={control}
                name="activityLevel"
                rules={{ required: 'Seleziona il livello di attività' }}
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

            <ResultsCard computed={computed} />

            <QuickAddonsCard />

            <Card style={styles.card}>
              <Text style={typography.label}>Test</Text>
              <Text style={typography.caption}>
                Cancella il profilo per ricominciare dall’onboarding. Utile
                durante lo sviluppo; pasti e preferiti restano intatti.
              </Text>
              <Button
                label="Reset app (torna all’onboarding)"
                variant="secondary"
                onPress={handleReset}
                loading={resetting}
              />
              <Text style={typography.caption}>
                Reset totale: cancella anche pasti, preferiti e aggiunte
                rapide. Il database riparte da zero con i food e le aggiunte
                rapide di default.
              </Text>
              <Button
                label="Reset DB (azzera tutto)"
                variant="secondary"
                onPress={handleResetDb}
                loading={resettingDb}
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
      <Text style={typography.label}>Valori calcolati</Text>
      <View style={styles.resultsGrid}>
        <ResultRow
          label="BMR"
          explainer="bmr"
          value={computed ? `${Math.round(computed.bmr)} kcal` : '—'}
        />
        <ResultRow
          label="TDEE"
          explainer="tdee"
          value={computed ? `${Math.round(computed.tdee)} kcal` : '—'}
        />
        <ResultRow
          label="Calorie target"
          explainer="target"
          value={computed ? `${Math.round(computed.target)} kcal` : '—'}
          highlight
        />
      </View>
    </Card>
  );
}

function ResultRow({
  label,
  value,
  explainer,
  highlight = false,
}: {
  label: string;
  value: string;
  explainer: ProfileExplainerKey;
  highlight?: boolean;
}) {
  const info = PROFILE_EXPLAINERS[explainer];
  return (
    <View style={styles.resultRow}>
      <View style={styles.resultLabelRow}>
        <Text style={typography.caption}>{label}</Text>
        <InfoTooltip title={info.title} body={info.body} />
      </View>
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
  };
}

function buildFormValues(profile: UserProfile | null): FormValues {
  if (!profile) return emptyValues();
  return {
    weightKg: String(profile.weightKg),
    heightCm: String(profile.heightCm),
    age: String(profile.age),
    gender: profile.gender,
    activityLevel: profile.activityLevel,
    weeklyGoalKg: profile.weeklyGoalKg,
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
  resultLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});

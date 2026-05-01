import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { InfoTooltip } from '@/components/InfoTooltip';
import { Input } from '@/components/Input';
import { OptionSelect } from '@/components/OptionSelect';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useToast } from '@/components/Toast';
import { WeightRing } from '@/components/WeightRing';
import type { ActivityLevel, Gender, UserProfile } from '@/database';
import { useProfile } from '@/hooks/useProfile';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { ACTIVITY_MULTIPLIERS } from '@/utils/calorieCalculator';
import { PROFILE_EXPLAINERS } from '@/utils/profileExplainers';
import type { ProfileExplainerKey } from '@/utils/profileExplainers';
import {
  ACTIVITY_OPTIONS,
  GENDER_OPTIONS,
  WEEKLY_GOAL_OPTIONS,
} from '@/utils/profileOptions';

const AUTOSAVE_DEBOUNCE_MS = 600;
const WEIGHT_STEP_KG = 0.2;

type FormValues = {
  name: string;
  heightCm: string;
  age: string;
  gender: Gender | null;
  activityLevel: ActivityLevel | null;
  weeklyGoalKg: number | null;
};

type ParsedFormData = {
  name: string | null;
  heightCm: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  weeklyGoalKg: number;
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { profile, patchProfile, loading: profileLoading } = useProfile();

  const {
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: emptyValues(),
    mode: 'onChange',
  });

  // Allinea il form al profilo appena caricato. Senza questo reset gli Input
  // partirebbero con stringhe vuote anche quando in DB esistono i valori.
  useEffect(() => {
    if (profileLoading) return;
    reset(buildFormValues(profile));
  }, [profile, profileLoading, reset]);

  const watched = useWatch({ control }) as FormValues;
  const parsed = useMemo(() => parseFormData(watched), [watched]);

  // Autosave dei campi del form (escluso il peso, che ha la sua UI con +/-).
  // Stesso pattern di SettingsScreen ma usa patchProfile per non sovrascrivere
  // i campi gestiti altrove (weight, targetWeight).
  const lastSavedRef = useRef<ParsedFormData | null>(null);
  useEffect(() => {
    if (profileLoading || !profile || !parsed) return;
    if (sameFormData(parsed, lastSavedRef.current ?? buildLastSaved(profile))) return;
    const handle = setTimeout(() => {
      patchProfile({
        name: parsed.name,
        heightCm: parsed.heightCm,
        age: parsed.age,
        gender: parsed.gender,
        activityLevel: parsed.activityLevel,
        weeklyGoalKg: parsed.weeklyGoalKg,
      })
        .then(() => {
          lastSavedRef.current = parsed;
        })
        .catch(() => undefined);
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [parsed, profile, profileLoading, patchProfile]);

  if (profileLoading || !profile) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Profilo"
          style={{ paddingTop: insets.top + spacing.xl }}
        />
        <View style={styles.scroll}>
          <Card style={styles.card}>
            <Text style={typography.body}>Caricamento…</Text>
          </Card>
        </View>
      </View>
    );
  }

  const handleAdjustWeight = async (deltaKg: number) => {
    const next = roundToStep(profile.weightKg + deltaKg);
    if (next < 20 || next > 400) return;
    await patchProfile({ weightKg: next });
  };

  const handleSetTargetWeight = async (kg: number) => {
    if (!Number.isFinite(kg) || kg < 20 || kg > 400) {
      toast.show('Peso obiettivo non valido (20–400 kg)');
      return;
    }
    await patchProfile({
      targetWeightKg: kg,
      // Reset dello "start" al peso corrente: il progresso del ring
      // riparte da qui ogni volta che si imposta o cambia l'obiettivo.
      startWeightKg: profile.weightKg,
    });
    toast.show('Obiettivo aggiornato');
  };

  const handleClearTarget = async () => {
    await patchProfile({ targetWeightKg: null, startWeightKg: null });
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Profilo"
        subtitle="Il salvataggio è automatico"
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
        <IdentityCard
          name={profile.name}
          age={profile.age}
          gender={profile.gender}
          control={control}
          error={errors.name?.message}
        />

        <WeightCard
          weightKg={profile.weightKg}
          targetKg={profile.targetWeightKg}
          startKg={profile.startWeightKg}
          onAdjust={handleAdjustWeight}
          onSetTarget={handleSetTargetWeight}
          onClearTarget={handleClearTarget}
        />

        <Card style={styles.card}>
          <Text style={typography.label}>Dati personali</Text>

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

        <ResultsCard
          bmr={profile.tdee && profile.weightKg ? estimateBMR(profile) : null}
          tdee={profile.tdee}
          target={profile.targetCalories}
        />
      </ScrollView>
    </View>
  );
}

function IdentityCard({
  name,
  age,
  gender,
  control,
  error,
}: {
  name: string | null;
  age: number;
  gender: Gender;
  control: ReturnType<typeof useForm<FormValues>>['control'];
  error?: string;
}) {
  const initial = (name ?? '').trim().charAt(0).toUpperCase() || '?';
  const subtitle = `${age} anni · ${gender === 'M' ? 'Uomo' : 'Donna'}`;
  return (
    <Card style={styles.identityCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.identityRight}>
        <Controller
          control={control}
          name="name"
          rules={{ maxLength: { value: 30, message: 'Massimo 30 caratteri' } }}
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Nome"
              placeholder="Come ti chiami?"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              containerStyle={styles.identityInput}
            />
          )}
        />
        <Text style={typography.caption}>{subtitle}</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </Card>
  );
}

function WeightCard({
  weightKg,
  targetKg,
  startKg,
  onAdjust,
  onSetTarget,
  onClearTarget,
}: {
  weightKg: number;
  targetKg: number | null;
  startKg: number | null;
  onAdjust: (deltaKg: number) => Promise<void>;
  onSetTarget: (kg: number) => Promise<void>;
  onClearTarget: () => Promise<void>;
}) {
  const [editingTarget, setEditingTarget] = useState(false);
  const [draftTarget, setDraftTarget] = useState(
    targetKg !== null ? formatKg(targetKg) : '',
  );

  // Se il target esterno cambia (es. reset DB), riallinea la draft.
  useEffect(() => {
    setDraftTarget(targetKg !== null ? formatKg(targetKg) : '');
  }, [targetKg]);

  const delta = targetKg !== null ? weightKg - targetKg : null;
  const reached = delta !== null && Math.abs(delta) < 0.05;

  const deltaLabel = (() => {
    if (delta === null) return null;
    if (reached) return 'Obiettivo raggiunto!';
    const abs = Math.abs(delta).toLocaleString('it-IT', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    return delta > 0 ? `Ti mancano ${abs} kg da perdere` : `Ti mancano ${abs} kg da prendere`;
  })();

  const handleSave = async () => {
    const n = Number(draftTarget.replace(',', '.'));
    await onSetTarget(n);
    setEditingTarget(false);
  };

  return (
    <Card style={styles.weightCard}>
      <View style={styles.weightHeader}>
        <Text style={typography.label}>Peso</Text>
        {targetKg !== null && !editingTarget ? (
          <Pressable
            onPress={() => setEditingTarget(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Modifica obiettivo"
          >
            <Text style={styles.weightHeaderAction}>Modifica obiettivo</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.ringWrap}>
        <WeightRing weightKg={weightKg} targetKg={targetKg} startKg={startKg} />
      </View>

      <View style={styles.weightControls}>
        <StepButton
          icon="minus"
          onPress={() => onAdjust(-WEIGHT_STEP_KG)}
          accessibilityLabel="Diminuisci peso di 200 grammi"
        />
        <View style={styles.stepLabel}>
          <Text style={typography.caption}>passo</Text>
          <Text style={typography.bodyBold}>200 g</Text>
        </View>
        <StepButton
          icon="plus"
          onPress={() => onAdjust(WEIGHT_STEP_KG)}
          accessibilityLabel="Aumenta peso di 200 grammi"
        />
      </View>

      {deltaLabel ? (
        <Text
          style={[
            styles.deltaLabel,
            reached && { color: colors.green },
          ]}
        >
          {deltaLabel}
        </Text>
      ) : null}

      {targetKg === null || editingTarget ? (
        <View style={styles.targetEdit}>
          <Input
            label="Peso obiettivo"
            unit="kg"
            keyboardType="decimal-pad"
            placeholder="es. 70.0"
            value={draftTarget}
            onChangeText={setDraftTarget}
            containerStyle={styles.targetInput}
          />
          <View style={styles.targetActions}>
            <Button
              label={targetKg === null ? 'Imposta obiettivo' : 'Salva'}
              onPress={handleSave}
              style={styles.targetActionBtn}
            />
            {targetKg !== null ? (
              <Button
                label="Rimuovi"
                variant="secondary"
                onPress={async () => {
                  await onClearTarget();
                  setEditingTarget(false);
                }}
                style={styles.targetActionBtn}
              />
            ) : null}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

function StepButton({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: 'plus' | 'minus';
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.stepBtn,
        shadows.sm,
        pressed && styles.stepBtnPressed,
      ]}
    >
      <Icon name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

function ResultsCard({
  bmr,
  tdee,
  target,
}: {
  bmr: number | null;
  tdee: number | null;
  target: number | null;
}) {
  return (
    <Card style={styles.resultsCard}>
      <Text style={typography.label}>Valori calcolati</Text>
      <View style={styles.resultsGrid}>
        <ResultRow
          label="BMR"
          explainer="bmr"
          value={bmr ? `${Math.round(bmr)} kcal` : '—'}
        />
        <ResultRow
          label="TDEE"
          explainer="tdee"
          value={tdee ? `${Math.round(tdee)} kcal` : '—'}
        />
        <ResultRow
          label="Calorie target"
          explainer="target"
          value={target ? `${Math.round(target)} kcal` : '—'}
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
    name: '',
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
    name: profile.name ?? '',
    heightCm: String(profile.heightCm),
    age: String(profile.age),
    gender: profile.gender,
    activityLevel: profile.activityLevel,
    weeklyGoalKg: profile.weeklyGoalKg,
  };
}

function buildLastSaved(profile: UserProfile): ParsedFormData {
  return {
    name: profile.name,
    heightCm: profile.heightCm,
    age: profile.age,
    gender: profile.gender,
    activityLevel: profile.activityLevel,
    weeklyGoalKg: profile.weeklyGoalKg,
  };
}

function parseFormData(v: FormValues): ParsedFormData | null {
  const heightCm = Number(String(v.heightCm).replace(',', '.'));
  const age = Number(v.age);
  if (
    !Number.isFinite(heightCm) ||
    !Number.isInteger(age) ||
    v.gender === null ||
    v.activityLevel === null ||
    v.weeklyGoalKg === null
  ) {
    return null;
  }
  if (heightCm < 100 || heightCm > 250) return null;
  if (age < 10 || age > 120) return null;
  const trimmedName = v.name.trim();
  return {
    name: trimmedName.length > 0 ? trimmedName : null,
    heightCm,
    age,
    gender: v.gender,
    activityLevel: v.activityLevel,
    weeklyGoalKg: v.weeklyGoalKg,
  };
}

function sameFormData(a: ParsedFormData, b: ParsedFormData): boolean {
  return (
    (a.name ?? '') === (b.name ?? '') &&
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

function roundToStep(kg: number): number {
  // Allinea a multipli di 100 g (0.1 kg) per evitare drift floating-point
  // dopo molti +/-: es. 70.0 + 0.2 ripetuto deve restare un multiplo di 0.1.
  return Math.round(kg * 10) / 10;
}

function formatKg(value: number): string {
  return value.toLocaleString('it-IT', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

// Il BMR non è persistito su user_profile: lo ricaviamo invertendo il
// multiplier dall'ActivityLevel (BMR = TDEE / multiplier).
function estimateBMR(profile: UserProfile): number {
  return profile.tdee / ACTIVITY_MULTIPLIERS[profile.activityLevel];
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
  identityCard: {
    padding: spacing.screen,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radii.round,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.display,
    fontSize: 28,
    color: colors.green,
  },
  identityRight: {
    flex: 1,
    gap: spacing.xs,
  },
  identityInput: {
    marginBottom: 0,
  },
  weightCard: {
    padding: spacing.screen,
    gap: spacing.xl,
    alignItems: 'stretch',
  },
  weightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weightHeaderAction: {
    ...typography.caption,
    color: colors.green,
  },
  ringWrap: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  weightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: radii.round,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnPressed: {
    backgroundColor: colors.bg,
  },
  stepLabel: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
  deltaLabel: {
    ...typography.bodyBold,
    textAlign: 'center',
    color: colors.text,
  },
  targetEdit: {
    gap: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  targetInput: {
    marginBottom: 0,
  },
  targetActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  targetActionBtn: {
    flex: 1,
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

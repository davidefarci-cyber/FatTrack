import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Input } from '@/components/Input';
import type { ActivityLevel, Gender } from '@/database';
import { useProfile } from '@/hooks/useProfile';
import { colors, fontFamily, radii, shadows, spacing, typography } from '@/theme';
import {
  calculateBMR,
  calculateTDEE,
  calculateTarget,
} from '@/utils/calorieCalculator';

// Onboarding a 4 step in linea col prototipo (design/fattrack/project/
// fattrack-screens.jsx):
//   step 0 → Profilo     (arancione)  peso/altezza/età + sesso
//   step 1 → Attività    (blu)        5 livelli con icona
//   step 2 → Obiettivo   (viola)      4 obiettivi settimanali
//   step 3 → Risultato   (verde)      riepilogo BMR/TDEE/deficit + target

type Form = {
  weightKg: string;
  heightCm: string;
  age: string;
  gender: Gender | null;
  activityLevel: ActivityLevel | null;
  weeklyGoalKg: number | null;
};

const DEFAULT_FORM: Form = {
  weightKg: '',
  heightCm: '',
  age: '',
  gender: null,
  activityLevel: null,
  weeklyGoalKg: null,
};

type StepDef = {
  label: string;
  title: string;
  color: string;
};

const STEPS: ReadonlyArray<StepDef> = [
  { label: 'Profilo', title: 'Ciao! Parlami di te', color: colors.orange },
  { label: 'Attività', title: 'Quanto sei attivo?', color: colors.blue },
  { label: 'Obiettivo', title: 'Qual è il tuo obiettivo?', color: colors.purple },
  { label: 'Risultato', title: 'Tutto pronto!', color: colors.green },
];

type ActivityOption = {
  value: ActivityLevel;
  icon: string;
  label: string;
  description: string;
};

const ACTIVITIES: ReadonlyArray<ActivityOption> = [
  { value: 1, icon: '🪑', label: 'Sedentario', description: 'Ufficio, poco moto' },
  { value: 2, icon: '🚶', label: 'Leggero', description: '1–3 allenamenti/sett' },
  { value: 3, icon: '🚴', label: 'Moderato', description: '3–5 allenamenti/sett' },
  { value: 4, icon: '🏋️', label: 'Attivo', description: '6–7 allenamenti/sett' },
  { value: 5, icon: '⚡', label: 'Intensivo', description: 'Doppi allenamenti' },
];

type GoalOption = {
  value: number;
  label: string;
  description: string;
};

const GOALS: ReadonlyArray<GoalOption> = [
  { value: 0.25, label: '–0,25 kg / settimana', description: 'Lento e costante' },
  { value: 0.5, label: '–0,5 kg / settimana', description: 'Consigliato' },
  { value: 0.75, label: '–0,75 kg / settimana', description: 'Impegnativo' },
  { value: 1, label: '–1 kg / settimana', description: 'Aggressivo' },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { saveProfile } = useProfile();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const color = STEPS[step].color;

  const parsed = useMemo(() => parseForm(form), [form]);
  const computed = useMemo(() => {
    if (!parsed) return null;
    const bmr = calculateBMR(parsed.weightKg, parsed.heightCm, parsed.age, parsed.gender);
    const tdee = calculateTDEE(bmr, parsed.activityLevel);
    const target = calculateTarget(tdee, parsed.weeklyGoalKg);
    return { bmr, tdee, target };
  }, [parsed]);

  const canAdvance = useMemo(() => {
    switch (step) {
      case 0:
        return validateStep0(form);
      case 1:
        return form.activityLevel !== null;
      case 2:
        return form.weeklyGoalKg !== null;
      case 3:
        return parsed !== null;
      default:
        return false;
    }
  }, [form, step, parsed]);

  const update = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = async () => {
    if (!canAdvance) return;
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: color,
            paddingTop: insets.top + spacing.xxl,
            paddingBottom: spacing.screen,
          },
        ]}
      >
        <View style={styles.progressBar}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressSegment,
                {
                  backgroundColor:
                    i <= step ? colors.card : 'rgba(255, 255, 255, 0.3)',
                },
              ]}
            />
          ))}
        </View>
        <Text style={styles.stepCounter}>
          Passo {step + 1} di {STEPS.length}
        </Text>
        <Text style={styles.stepTitle}>{STEPS[step].title}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 ? (
          <ProfileStep form={form} update={update} color={color} />
        ) : step === 1 ? (
          <ActivityStep
            value={form.activityLevel}
            onChange={(v) => update('activityLevel', v)}
            color={color}
          />
        ) : step === 2 ? (
          <GoalStep
            value={form.weeklyGoalKg}
            onChange={(v) => update('weeklyGoalKg', v)}
            color={color}
          />
        ) : (
          <ResultStep computed={computed} />
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + spacing.screen },
        ]}
      >
        {step > 0 ? (
          <Pressable
            onPress={() => setStep((s) => s - 1)}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Passo precedente"
          >
            <Icon name="chevron-left" size={18} color={colors.textSec} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={handleNext}
          disabled={!canAdvance || saving}
          style={[
            styles.primaryBtn,
            {
              backgroundColor: color,
              opacity: canAdvance && !saving ? 1 : 0.5,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={step === STEPS.length - 1 ? 'Iniziamo' : 'Avanti'}
        >
          <Text style={styles.primaryBtnLabel}>
            {step === STEPS.length - 1 ? 'Iniziamo!' : 'Avanti'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// -----------------------------------------------------------------------------
// Step 0 — Profilo
// -----------------------------------------------------------------------------

function ProfileStep({
  form,
  update,
  color,
}: {
  form: Form;
  update: <K extends keyof Form>(key: K, value: Form[K]) => void;
  color: string;
}) {
  return (
    <View style={styles.stepBody}>
      <View style={styles.row2}>
        <View style={{ flex: 1 }}>
          <Input
            label="Peso attuale"
            unit="kg"
            keyboardType="decimal-pad"
            value={form.weightKg}
            onChangeText={(v) => update('weightKg', v)}
            placeholder="70"
            containerStyle={styles.noBottomMargin}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="Altezza"
            unit="cm"
            keyboardType="number-pad"
            value={form.heightCm}
            onChangeText={(v) => update('heightCm', v)}
            placeholder="170"
            containerStyle={styles.noBottomMargin}
          />
        </View>
      </View>

      <Input
        label="Età"
        unit="anni"
        keyboardType="number-pad"
        value={form.age}
        onChangeText={(v) => update('age', v)}
        placeholder="30"
        containerStyle={styles.noBottomMargin}
      />

      <View style={styles.fieldBlock}>
        <Text style={typography.label}>Sesso biologico</Text>
        <View style={styles.row2}>
          {(['M', 'F'] as const).map((g) => {
            const selected = form.gender === g;
            return (
              <Pressable
                key={g}
                onPress={() => update('gender', g)}
                style={[
                  styles.genderBtn,
                  {
                    borderColor: selected ? color : colors.border,
                    backgroundColor: selected ? tint(color) : colors.card,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={g === 'M' ? 'Uomo' : 'Donna'}
              >
                <Text
                  style={[
                    typography.bodyBold,
                    { color: selected ? color : colors.textSec },
                  ]}
                >
                  {g === 'M' ? 'Uomo' : 'Donna'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Step 1 — Attività
// -----------------------------------------------------------------------------

function ActivityStep({
  value,
  onChange,
  color,
}: {
  value: ActivityLevel | null;
  onChange: (v: ActivityLevel) => void;
  color: string;
}) {
  return (
    <View style={styles.stepBody}>
      {ACTIVITIES.map((a) => {
        const selected = value === a.value;
        return (
          <Pressable
            key={a.value}
            onPress={() => onChange(a.value)}
            style={[
              styles.optionRow,
              {
                borderColor: selected ? color : colors.border,
                backgroundColor: selected ? tint(color) : colors.card,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${a.label}. ${a.description}`}
          >
            <Text style={styles.optionIcon}>{a.icon}</Text>
            <View style={styles.optionText}>
              <Text style={typography.body}>{a.label}</Text>
              <Text style={typography.caption}>{a.description}</Text>
            </View>
            {selected ? (
              <View style={[styles.checkDot, { backgroundColor: color }]}>
                <Icon name="check" size={12} color={colors.card} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// -----------------------------------------------------------------------------
// Step 2 — Obiettivo
// -----------------------------------------------------------------------------

function GoalStep({
  value,
  onChange,
  color,
}: {
  value: number | null;
  onChange: (v: number) => void;
  color: string;
}) {
  return (
    <View style={styles.stepBody}>
      {GOALS.map((g) => {
        const selected = value === g.value;
        return (
          <Pressable
            key={g.value}
            onPress={() => onChange(g.value)}
            style={[
              styles.optionRow,
              {
                borderColor: selected ? color : colors.border,
                backgroundColor: selected ? tint(color) : colors.card,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${g.label}. ${g.description}`}
          >
            <View
              style={[
                styles.goalBadge,
                { backgroundColor: selected ? color : colors.bg },
              ]}
            >
              <Text
                style={[
                  styles.goalBadgeText,
                  { color: selected ? colors.card : colors.textSec },
                ]}
              >
                {g.value}
              </Text>
            </View>
            <View style={styles.optionText}>
              <Text style={typography.body}>{g.label}</Text>
              <Text style={typography.caption}>{g.description}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// -----------------------------------------------------------------------------
// Step 3 — Risultato
// -----------------------------------------------------------------------------

function ResultStep({
  computed,
}: {
  computed: { bmr: number; tdee: number; target: number } | null;
}) {
  if (!computed) {
    return (
      <View style={styles.stepBody}>
        <Text style={typography.body}>
          Completa i passi precedenti per vedere l’obiettivo calorico.
        </Text>
      </View>
    );
  }
  const target = Math.round(computed.target);
  const bmr = Math.round(computed.bmr);
  const tdee = Math.round(computed.tdee);
  const deficit = Math.max(tdee - target, 0);
  return (
    <View style={styles.resultContainer}>
      <View style={styles.successCircle}>
        <Icon name="check" size={36} color={colors.green} />
      </View>
      <Text style={typography.caption}>
        Il tuo obiettivo calorico giornaliero è
      </Text>
      <Text style={styles.resultTarget}>
        {target.toLocaleString('it-IT')}
      </Text>
      <Text style={styles.resultUnit}>kcal / giorno</Text>

      <View style={styles.resultPills}>
        <ResultPill label="BMR" value={`${bmr} kcal`} color={colors.orange} bg={colors.orangeLight} />
        <ResultPill label="TDEE" value={`${tdee} kcal`} color={colors.blue} bg={colors.blueLight} />
        <ResultPill
          label="Deficit"
          value={`${deficit} kcal`}
          color={colors.purple}
          bg={colors.purpleLight}
        />
      </View>
    </View>
  );
}

function ResultPill({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.resultPill, { backgroundColor: bg }]}>
      <Text style={[typography.bodyBold, { color }]}>{value}</Text>
      <Text style={[typography.micro, { color: colors.textSec }]}>{label}</Text>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function validateStep0(form: Form): boolean {
  const w = Number(String(form.weightKg).replace(',', '.'));
  const h = Number(String(form.heightCm).replace(',', '.'));
  const a = Number(form.age);
  if (!Number.isFinite(w) || w < 20 || w > 400) return false;
  if (!Number.isFinite(h) || h < 100 || h > 250) return false;
  if (!Number.isInteger(a) || a < 10 || a > 120) return false;
  if (form.gender === null) return false;
  return true;
}

type ParsedProfile = {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  weeklyGoalKg: number;
};

function parseForm(form: Form): ParsedProfile | null {
  const weightKg = Number(String(form.weightKg).replace(',', '.'));
  const heightCm = Number(String(form.heightCm).replace(',', '.'));
  const age = Number(form.age);
  if (
    !Number.isFinite(weightKg) ||
    !Number.isFinite(heightCm) ||
    !Number.isInteger(age) ||
    form.gender === null ||
    form.activityLevel === null ||
    form.weeklyGoalKg === null
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
    gender: form.gender,
    activityLevel: form.activityLevel,
    weeklyGoalKg: form.weeklyGoalKg,
  };
}

// Sfondo tenue (~8% opacity) usando il colore dello step come tinta
// trasparente. Restiamo negli hex fissi del theme: aggiungiamo il canale
// alpha con una tabella predefinita per i 4 step, così non introduciamo
// calcoli runtime su stringhe HSL.
function tint(stepColor: string): string {
  switch (stepColor) {
    case colors.orange:
      return colors.orangeLight;
    case colors.blue:
      return colors.blueLight;
    case colors.purple:
      return colors.purpleLight;
    case colors.green:
      return colors.greenLight;
    default:
      return colors.bg;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  header: {
    paddingHorizontal: spacing.screen,
    gap: spacing.md,
  },
  progressBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  stepCounter: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  stepTitle: {
    fontFamily: fontFamily.extrabold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.card,
  },
  scroll: {
    padding: spacing.screen,
    gap: spacing.xl,
    paddingBottom: spacing.screen * 2,
  },
  stepBody: {
    gap: spacing.md,
  },
  row2: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  noBottomMargin: {
    marginBottom: 0,
  },
  fieldBlock: {
    gap: spacing.sm,
  },
  genderBtn: {
    flex: 1,
    height: 50,
    borderRadius: radii.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.xl,
    borderWidth: 2,
  },
  optionIcon: {
    fontSize: 22,
  },
  optionText: {
    flex: 1,
    gap: spacing.xxs,
  },
  checkDot: {
    width: 22,
    height: 22,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalBadge: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalBadgeText: {
    fontFamily: fontFamily.extrabold,
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  primaryBtnLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.card,
  },
  resultContainer: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: radii.round,
    backgroundColor: colors.greenLight,
    borderWidth: 3,
    borderColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  resultTarget: {
    fontFamily: fontFamily.extrabold,
    fontSize: 44,
    lineHeight: 48,
    color: colors.text,
  },
  resultUnit: {
    ...typography.body,
    color: colors.textSec,
    marginBottom: spacing.xl,
  },
  resultPills: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  resultPill: {
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.xxs,
  },
});

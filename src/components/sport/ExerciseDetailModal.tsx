import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';
import type { Exercise } from '@/database';
import { colors, radii, spacing, typography } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';

// Dettaglio esercizio: header (nome + badge muscleGroup) + caption con
// equipment/level/MET, descrizione, guida step-by-step e — se disponibile —
// pulsante "Guarda video" che apre il link via `Linking.openURL`. In Fase 4
// `videoUrl` è null per tutti gli esercizi seedati (i link curati arrivano
// in un TODO futuro), ma la UI è già pronta.

type Props = {
  visible: boolean;
  exercise: Exercise | null;
  onClose: () => void;
};

export function ExerciseDetailModal({ visible, exercise, onClose }: Props) {
  const theme = useAppTheme();
  const toast = useToast();

  if (!exercise) {
    return (
      <BottomSheet visible={visible} onClose={onClose}>
        <View />
      </BottomSheet>
    );
  }

  const metaParts = [
    exercise.equipment,
    exercise.level,
    `MET ${exercise.met ?? '—'}`,
  ];

  const handleOpenVideo = async () => {
    if (!exercise.videoUrl) return;
    try {
      const supported = await Linking.canOpenURL(exercise.videoUrl);
      if (!supported) {
        toast.show('Link video non supportato');
        return;
      }
      await Linking.openURL(exercise.videoUrl);
    } catch {
      toast.show('Impossibile aprire il video');
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightPercent={85}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={typography.h1}>{exercise.name}</Text>
          <View style={styles.headerMeta}>
            <View
              style={[styles.badge, { backgroundColor: theme.accentSoft }]}
              accessibilityLabel={`Gruppo ${exercise.muscleGroup}`}
            >
              <Text style={[typography.bodyBold, { color: theme.accentDark }]}>
                {exercise.muscleGroup}
              </Text>
            </View>
          </View>
          <Text style={typography.caption}>{metaParts.join(' · ')}</Text>
        </View>

        {exercise.description ? (
          <Text style={typography.body}>{exercise.description}</Text>
        ) : null}

        <View style={styles.section}>
          <Text style={typography.label}>Come si fa</Text>
          {exercise.guideSteps && exercise.guideSteps.length > 0 ? (
            <View style={styles.steps}>
              {exercise.guideSteps.map((step, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.stepRow,
                    idx < (exercise.guideSteps?.length ?? 0) - 1 &&
                      styles.stepDivider,
                  ]}
                >
                  <View
                    style={[
                      styles.stepIndex,
                      { backgroundColor: theme.accentSoft },
                    ]}
                  >
                    <Text
                      style={[typography.bodyBold, { color: theme.accentDark }]}
                    >
                      {idx + 1}
                    </Text>
                  </View>
                  <Text style={[typography.body, styles.stepText]}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={typography.caption}>Guida non disponibile.</Text>
          )}
        </View>

        <View style={styles.footer}>
          {exercise.videoUrl ? (
            <Pressable
              onPress={handleOpenVideo}
              accessibilityRole="link"
              accessibilityLabel={`Apri video di ${exercise.name}`}
              style={({ pressed }) => [
                styles.videoBtn,
                { backgroundColor: theme.accent },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[typography.bodyBold, { color: colors.card }]}>
                Guarda video
              </Text>
            </Pressable>
          ) : null}
          <Button label="Chiudi" variant="secondary" onPress={onClose} />
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.screen,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.md,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.round,
  },
  section: {
    gap: spacing.md,
  },
  steps: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  stepDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepIndex: {
    width: 24,
    height: 24,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepText: {
    flex: 1,
  },
  footer: {
    gap: spacing.md,
  },
  videoBtn: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.screen,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
  },
  pressed: {
    opacity: 0.85,
  },
});

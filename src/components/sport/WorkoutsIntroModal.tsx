import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { colors, radii, spacing, typography } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';

// Modal di onboarding mostrato in WorkoutsScreen. Una sola modal con due
// "varianti" di contenuto in base al kind. La logica di "quale mostrare"
// vive nel parent (predicate sui coach_marks_seen). La modal qui è
// visualmente identica per entrambi: titolo + descrizione + 2 CTA.

export type WorkoutsIntroKind = 'equipment' | 'programs';

type Props = {
  visible: boolean;
  kind: WorkoutsIntroKind;
  onPrimary: () => void;
  onDismiss: () => void;
};

const COPY: Record<
  WorkoutsIntroKind,
  {
    icon: 'dumbbell' | 'bolt';
    title: string;
    body: string;
    primaryLabel: string;
    secondaryLabel: string;
  }
> = {
  equipment: {
    icon: 'dumbbell',
    title: 'Benvenuto nelle Schede',
    body: 'Per consigliarti gli allenamenti più adatti, dicci quale attrezzatura hai a disposizione (manubri, panca, tapis roulant, …). Bastano pochi tap nelle Impostazioni: porto te direttamente lì.',
    primaryLabel: 'Apri impostazioni',
    secondaryLabel: 'Più tardi',
  },
  programs: {
    icon: 'bolt',
    title: 'Nuovi programmi di allenamento',
    body: 'Ora puoi seguire piani multi-giorno: dimagrimento, resistenza, mantenimento e mobilità. Imposta quello che fa per te e in home ti proporrò la prossima sessione.',
    primaryLabel: 'Esplora i programmi',
    secondaryLabel: 'Più tardi',
  },
};

export function WorkoutsIntroModal({
  visible,
  kind,
  onPrimary,
  onDismiss,
}: Props) {
  const { accent } = useAppTheme();
  const copy = COPY[kind];
  return (
    <BottomSheet visible={visible} onClose={onDismiss} maxHeightPercent={50}>
      <View style={styles.container}>
        <View style={[styles.iconBox, { backgroundColor: accent }]}>
          <Icon name={copy.icon} size={28} color="#FFFFFF" />
        </View>
        <Text style={typography.h1}>{copy.title}</Text>
        <Text style={[typography.body, styles.body]}>{copy.body}</Text>
        <View style={styles.actions}>
          <Button label={copy.primaryLabel} onPress={onPrimary} />
          <Pressable
            onPress={onDismiss}
            style={styles.secondary}
            accessibilityRole="button"
            accessibilityLabel={copy.secondaryLabel}
          >
            <Text style={[typography.bodyBold, { color: colors.textSec }]}>
              {copy.secondaryLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.screen,
    gap: spacing.lg,
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    color: colors.textSec,
    lineHeight: 22,
  },
  actions: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  secondary: {
    paddingVertical: spacing.md,
    alignSelf: 'center',
  },
});

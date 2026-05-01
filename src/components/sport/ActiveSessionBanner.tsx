import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';

// Banner sticky sopra la BottomTabBar quando una sessione è attiva ma
// l'utente sta navigando in altre tab. Tap → riapre la
// ActiveSessionScreen. Mostra nome scheda + elapsed live; il caller
// (SportTabNavigator) ri-renderizza ogni 1s per aggiornare il timer.

type Props = {
  workoutName: string;
  elapsedSec: number;
  isPaused?: boolean;
  onPress: () => void;
  bottomOffset: number;
};

export function ActiveSessionBanner({
  workoutName,
  elapsedSec,
  isPaused,
  onPress,
  bottomOffset,
}: Props) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Riapri sessione ${workoutName}`}
      style={[
        styles.container,
        shadows.sm,
        {
          bottom: bottomOffset,
          backgroundColor: theme.accentSoft,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: theme.accent }]}>
        <Icon name="dumbbell" size={16} color={colors.card} />
      </View>
      <View style={styles.text}>
        <Text style={typography.bodyBold} numberOfLines={1}>
          {workoutName}
        </Text>
        <Text style={typography.caption}>
          {isPaused ? 'In pausa · ' : ''}
          {formatElapsed(elapsedSec)}
        </Text>
      </View>
      <View style={[styles.cta, { borderColor: theme.accent }]}>
        <Text style={[typography.bodyBold, { color: theme.accentDark }]}>
          Riapri
        </Text>
      </View>
    </Pressable>
  );
}

function formatElapsed(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.screen,
    right: spacing.screen,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.lg,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
  cta: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.round,
    borderWidth: 1.5,
  },
});

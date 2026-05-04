import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import { colors, radii, spacing, typography } from '@/theme';

// Primitive visivo per i coach mark: card colorata con icona, titolo,
// descrizione, CTA opzionale, tasto chiudi. Stessa silhouette del
// `SportModeHintBanner` storico, ma generalizzata. Le varianti di colore
// sono un piccolo set predefinito (purple, blue, green, orange) per evitare
// hex inline e restare in linea con i token del design.

export type CoachMarkBannerTone = 'purple' | 'blue' | 'green' | 'orange';

type Props = {
  tone: CoachMarkBannerTone;
  icon: IconName;
  title: string;
  description: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  onDismiss: () => void;
};

const TONE_COLORS: Record<CoachMarkBannerTone, { bg: string; dark: string }> = {
  purple: { bg: colors.purple, dark: '#A03AC4' },
  blue: { bg: colors.blue, dark: '#3550C8' },
  green: { bg: colors.green, dark: '#04A155' },
  orange: { bg: colors.orange, dark: '#E08531' },
};

export function CoachMarkBanner({
  tone,
  icon,
  title,
  description,
  primaryLabel,
  onPrimary,
  onDismiss,
}: Props) {
  const c = TONE_COLORS[tone];
  return (
    <View style={[styles.banner, { backgroundColor: c.bg }]}>
      <View style={[styles.iconWrap, { backgroundColor: c.dark }]}>
        <Icon name={icon} size={18} color="#FFFFFF" />
      </View>
      <View style={styles.textWrap}>
        <Text style={[typography.bodyBold, styles.title]}>{title}</Text>
        <Text style={[typography.caption, styles.subtitle]}>{description}</Text>
        {primaryLabel && onPrimary ? (
          <Pressable
            onPress={onPrimary}
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
            style={styles.cta}
          >
            <Text style={[typography.bodyBold, { color: c.dark }]}>
              {primaryLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable
        onPress={onDismiss}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Ho capito"
        style={styles.close}
      >
        <Icon name="close" size={18} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xl,
    borderRadius: radii.xxl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: '#FFFFFF',
  },
  subtitle: {
    color: '#FFFFFF',
    opacity: 0.92,
  },
  cta: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.round,
  },
  close: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

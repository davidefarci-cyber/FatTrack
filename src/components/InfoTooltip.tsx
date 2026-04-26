import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { colors, radii, shadows, spacing, typography } from '@/theme';

type InfoTooltipProps = {
  title: string;
  body: string;
  iconColor?: string;
  accessibilityLabel?: string;
};

// Trigger compatto + Modal centrato per spiegazioni inline (es. BMR/TDEE
// in Settings e Onboarding). Pattern semplice senza dipendenze esterne:
// niente popover ancorato, niente librerie UI. Il backdrop è cliccabile
// per chiudere; il bottone "OK" è il dismiss espliciti per accessibilità.
export function InfoTooltip({
  title,
  body,
  iconColor,
  accessibilityLabel,
}: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `Informazioni su ${title}`}
        style={styles.trigger}
      >
        <Icon name="info" size={14} color={iconColor ?? colors.textSec} />
      </Pressable>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.root}>
          <Pressable
            style={styles.backdrop}
            accessibilityLabel="Chiudi"
            onPress={() => setVisible(false)}
          />
          <View style={[styles.card, shadows.md]}>
            <Text style={typography.label}>{title}</Text>
            <Text style={typography.body}>{body}</Text>
            <Button
              label="OK"
              variant="secondary"
              onPress={() => setVisible(false)}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 24,
    height: 24,
    borderRadius: radii.round,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.screen,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.card,
    borderRadius: radii.xxl,
    padding: spacing.screen,
    gap: spacing.lg,
  },
});

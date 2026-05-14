import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Icon } from './Icon';
import { colors, radii, spacing, typography } from '@/theme';
import type { UpcomingItem } from '@/utils/upcomingChecker';

type Props = {
  visible: boolean;
  items: UpcomingItem[];
  onClose: () => void;
};

// Popup teaser delle feature in arrivo (TODO [38]). Lista tutte le voci
// ancora non viste in un unico sheet — compatto se 1, scrollabile se molte.
// Bottone "Ho capito" chiude e marca come viste (gestito dal chiamante).
export function UpcomingSheet({ visible, items, onClose }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Icon name="bolt" size={20} color={colors.orange} />
        </View>
        <Text style={typography.h1}>In arrivo</Text>
        <Text style={styles.subtitle}>Sneak peek delle prossime feature</Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item) => (
          <View key={item.id} style={styles.item}>
            <Text style={typography.bodyBold}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
            <View style={styles.etaRow}>
              <Icon name="timer" size={14} color={colors.textSec} />
              <Text style={styles.eta}>{item.etaHuman}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <Button label="Ho capito" onPress={onClose} style={styles.cta} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.round,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.caption,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  item: {
    padding: spacing.screen,
    borderRadius: radii.xxl,
    backgroundColor: colors.bg,
    gap: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.text,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  eta: {
    ...typography.caption,
    color: colors.textSec,
  },
  cta: {
    marginTop: spacing.md,
  },
});

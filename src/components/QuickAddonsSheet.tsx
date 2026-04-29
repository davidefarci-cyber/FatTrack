import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Icon } from '@/components/Icon';
import type { QuickAddon } from '@/database';
import { colors, radii, spacing, typography } from '@/theme';

// Sheet di selezione delle "Aggiunte rapide" (contorno, zucchero, grana, …).
// Si apre da un pasto in Home; ogni tap su una riga aggiunge l'addon al pasto
// senza chiudere lo sheet, così si possono accumulare aggiunte. Lo sheet si
// chiude solo con tap sul backdrop o swipe-down (gestito da BottomSheet).

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  addons: QuickAddon[];
  onPick: (addon: QuickAddon) => void;
};

export function QuickAddonsSheet({ visible, onClose, title, addons, onPick }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightPercent={55}>
      <View style={styles.header}>
        <Text style={typography.h1}>Aggiunte rapide</Text>
        <Text style={typography.caption}>{title}</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {addons.map((addon, idx) => (
          <Pressable
            key={addon.id}
            onPress={() => onPick(addon)}
            style={[styles.row, idx < addons.length - 1 && styles.rowDivider]}
            accessibilityRole="button"
            accessibilityLabel={`Aggiungi ${addon.label}`}
          >
            <View style={styles.iconBubble}>
              <Icon name="plus" size={14} color={colors.green} />
            </View>
            <Text style={[typography.body, styles.label]} numberOfLines={1}>
              {addon.label}
            </Text>
            <Text style={typography.bodyBold}>
              {Math.round(addon.calories).toLocaleString('it-IT')} kcal
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xxs,
    paddingBottom: spacing.xl,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: radii.round,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
  },
});

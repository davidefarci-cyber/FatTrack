import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Icon } from '@/components/Icon';
import type { Meal } from '@/database';
import { colors, radii, spacing, typography } from '@/theme';

// Bottom-sheet contestuale per le azioni di un singolo `MealRow`. Sostituisce
// il pulsante matita "edit only" con un menu esauriente: l'utente può
// modificare la voce, salvarla come aggiunta rapida o eliminarla. Aperto
// dal kebab `⋯` (sempre visibile) o da long-press sulla riga (scorciatoia
// per chi preferisce). Una sola voce attiva alla volta — il sheet chiude
// dopo la selezione e il caller dispatcha l'azione corrispondente.

type Props = {
  visible: boolean;
  meal: Meal | null;
  onClose: () => void;
  onEdit: () => void;
  onSaveAsQuickAddon: () => void;
  onDelete: () => void;
};

export function MealRowActionsSheet({
  visible,
  meal,
  onClose,
  onEdit,
  onSaveAsQuickAddon,
  onDelete,
}: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightPercent={45}>
      <View style={styles.header}>
        <Text style={typography.label}>Alimento</Text>
        <Text style={typography.h1} numberOfLines={1}>
          {meal?.foodName ?? ''}
        </Text>
        <Text style={typography.caption}>
          {meal
            ? `${Math.round(meal.caloriesTotal).toLocaleString('it-IT')} kcal`
            : ''}
        </Text>
      </View>

      <View style={styles.list}>
        <ActionRow
          icon="pencil"
          iconColor={colors.blue}
          iconBg={colors.blueLight}
          label="Modifica"
          description="Cambia grammi, porzione o pasto"
          onPress={onEdit}
        />
        <ActionRow
          icon="plus"
          iconColor={colors.green}
          iconBg={colors.greenLight}
          label="Salva come aggiunta rapida"
          description="Crea una scorciatoia a calorie fisse"
          onPress={onSaveAsQuickAddon}
        />
        <ActionRow
          icon="trash"
          iconColor={colors.red}
          iconBg={colors.redLight}
          label="Elimina"
          description="Rimuovi questa voce dal diario"
          onPress={onDelete}
          last
          destructive
        />
      </View>
    </BottomSheet>
  );
}

type ActionRowProps = {
  icon: 'pencil' | 'plus' | 'trash';
  iconColor: string;
  iconBg: string;
  label: string;
  description: string;
  onPress: () => void;
  last?: boolean;
  destructive?: boolean;
};

function ActionRow({
  icon,
  iconColor,
  iconBg,
  label,
  description,
  onPress,
  last,
  destructive,
}: ActionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.row, !last && styles.rowDivider]}
    >
      <View style={[styles.iconBubble, { backgroundColor: iconBg }]}>
        <Icon name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.rowText}>
        <Text
          style={[
            typography.bodyBold,
            destructive ? { color: colors.red } : null,
          ]}
        >
          {label}
        </Text>
        <Text style={typography.caption}>{description}</Text>
      </View>
      <Icon name="chevron-right" size={16} color={colors.textSec} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xxs,
    paddingBottom: spacing.xl,
  },
  list: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
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
    width: 36,
    height: 36,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: spacing.xxs,
  },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { MEAL_INFO } from '@/components/mealMeta';
import type { Meal, MealType } from '@/database';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { formatServing } from '@/utils/formatServing';

type MealSectionProps = {
  mealType: MealType;
  meals: Meal[];
  loading: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onAdd: () => void;
  onAddFavorite: () => void;
  onDelete: (id: number) => void;
  onEdit: (meal: Meal) => void;
};

export function MealSection({
  mealType,
  meals,
  loading,
  collapsed,
  onToggleCollapse,
  onAdd,
  onAddFavorite,
  onDelete,
  onEdit,
}: MealSectionProps) {
  const info = MEAL_INFO[mealType];
  const subtotal = Math.round(meals.reduce((sum, m) => sum + m.caloriesTotal, 0));
  const count = meals.length;

  return (
    <Card style={[styles.card, !collapsed && { backgroundColor: info.bg }]}>
      <Pressable
        onPress={onToggleCollapse}
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel={`${info.label}: ${collapsed ? 'espandi' : 'comprimi'}`}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.dot, { backgroundColor: info.color }]} />
          <View style={styles.headerText}>
            <Text style={[typography.body, { color: info.color }]}>
              {info.label}
            </Text>
            <Text style={typography.caption}>
              {count === 0
                ? 'Nessun alimento'
                : `${subtotal.toLocaleString('it-IT')} kcal · ${count} ${count === 1 ? 'voce' : 'voci'}`}
            </Text>
          </View>
        </View>
        <Icon
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={14}
          color={colors.textSec}
        />
      </Pressable>

      {!collapsed ? (
        <>
          <View style={styles.list}>
            {loading && meals.length === 0 ? (
              <Text style={[typography.caption, styles.empty]}>Caricamento…</Text>
            ) : meals.length === 0 ? (
              <Text style={[typography.caption, styles.empty]}>
                Nessun alimento registrato
              </Text>
            ) : (
              meals.map((meal, idx) => (
                <MealRow
                  key={meal.id}
                  meal={meal}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  isLast={idx === meals.length - 1}
                />
              ))
            )}
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={onAdd}
              style={[styles.primaryAction, { backgroundColor: info.color }]}
              accessibilityRole="button"
              accessibilityLabel={`Aggiungi alimento a ${info.label}`}
            >
              <Icon name="plus" size={14} color={colors.card} />
              <Text style={[typography.bodyBold, { color: colors.card }]}>
                Aggiungi
              </Text>
            </Pressable>
            <Pressable
              onPress={onAddFavorite}
              style={[styles.secondaryAction, { borderColor: info.color }]}
              accessibilityRole="button"
              accessibilityLabel={`Dai preferiti a ${info.label}`}
            >
              <Icon name="heart" size={14} color={info.color} />
              <Text style={[typography.bodyBold, { color: info.color }]}>
                Dai preferiti
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </Card>
  );
}

function MealRow({
  meal,
  onDelete,
  onEdit,
  isLast,
}: {
  meal: Meal;
  onDelete: (id: number) => void;
  onEdit: (meal: Meal) => void;
  isLast: boolean;
}) {
  return (
    <Swipeable
      renderRightActions={() => (
        <Pressable
          onPress={() => onDelete(meal.id)}
          style={styles.deleteAction}
          accessibilityRole="button"
          accessibilityLabel={`Elimina ${meal.foodName}`}
        >
          <Icon name="trash" size={16} color={colors.card} />
          <Text style={[typography.bodyBold, { color: colors.card }]}>Elimina</Text>
        </Pressable>
      )}
      overshootRight={false}
    >
      <Pressable
        onPress={() => onEdit(meal)}
        style={[styles.row, !isLast && styles.rowDivider]}
        accessibilityRole="button"
        accessibilityLabel={`Modifica ${meal.foodName}`}
      >
        <View style={styles.rowText}>
          <Text style={typography.body} numberOfLines={1}>
            {meal.foodName}
          </Text>
          <Text style={typography.caption}>
            {formatServing({
              grams: meal.grams,
              servingLabel: meal.servingLabel,
              servingQty: meal.servingQty,
            })}
          </Text>
        </View>
        <Text style={typography.bodyBold}>
          {Math.round(meal.caloriesTotal).toLocaleString('it-IT')} kcal
        </Text>
        <Icon name="pencil" size={14} color={colors.textSec} />
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.screen,
    gap: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xl,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  headerText: {
    flex: 1,
    gap: spacing.xxs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radii.round,
  },
  list: {
    gap: 0,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
  },
  empty: {
    paddingVertical: spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
  },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xl,
    paddingVertical: spacing.xl,
    backgroundColor: colors.card,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: {
    flex: 1,
    gap: spacing.xxs,
  },
  deleteAction: {
    width: 96,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    ...shadows.sm,
  },
});

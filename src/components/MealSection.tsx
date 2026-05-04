import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { MEAL_INFO } from '@/components/mealMeta';
import { MealRowActionsSheet } from '@/components/MealRowActionsSheet';
import { QuickAddonsSheet } from '@/components/QuickAddonsSheet';
import type { Meal, MealType, QuickAddon } from '@/database';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { formatServing } from '@/utils/formatServing';

type MealSectionProps = {
  mealType: MealType;
  meals: Meal[];
  loading: boolean;
  collapsed: boolean;
  quickAddons: QuickAddon[];
  // True quando il coach mark `rowActions` è attivo: anima la prima riga in
  // peek (translateX 0 → 28 → 0 con spring) per mostrare l'azione "Aggiunta
  // rapida" che sta dietro lo swipe-right. Una sola volta per render del mark.
  bouncePeek?: boolean;
  onToggleCollapse: () => void;
  onAdd: () => void;
  onAddFavorite: () => void;
  onAddAddon: (addon: QuickAddon) => void;
  onDelete: (id: number) => void;
  onEdit: (meal: Meal) => void;
  onSaveMealAsFavorite: () => void;
  onSaveRowAsQuickAddon: (meal: Meal) => void;
};

export function MealSection({
  mealType,
  meals,
  loading,
  collapsed,
  quickAddons,
  bouncePeek,
  onToggleCollapse,
  onAdd,
  onAddFavorite,
  onAddAddon,
  onDelete,
  onEdit,
  onSaveMealAsFavorite,
  onSaveRowAsQuickAddon,
}: MealSectionProps) {
  const info = MEAL_INFO[mealType];
  const subtotal = Math.round(meals.reduce((sum, m) => sum + m.caloriesTotal, 0));
  const count = meals.length;
  const [addonsSheetOpen, setAddonsSheetOpen] = useState(false);
  const [actionsMeal, setActionsMeal] = useState<Meal | null>(null);

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
        <View style={styles.headerActions}>
          {count > 0 ? (
            <Pressable
              onPress={onSaveMealAsFavorite}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Salva ${info.label} come preferito`}
              style={[styles.heartBtn, { borderColor: info.color }]}
            >
              <Icon name="heart" size={14} color={info.color} />
            </Pressable>
          ) : null}
          <Icon
            name={collapsed ? 'chevron-down' : 'chevron-up'}
            size={14}
            color={colors.textSec}
          />
        </View>
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
                  onOpenActions={(m) => setActionsMeal(m)}
                  onSaveAsQuickAddon={onSaveRowAsQuickAddon}
                  isLast={idx === meals.length - 1}
                  isFirst={idx === 0}
                  bouncePeek={bouncePeek}
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

          {quickAddons.length > 0 ? (
            <Pressable
              onPress={() => setAddonsSheetOpen(true)}
              style={styles.addonsTrigger}
              accessibilityRole="button"
              accessibilityLabel={`Apri aggiunte rapide per ${info.label}`}
            >
              <Icon name="plus" size={14} color={colors.green} />
              <Text style={[typography.bodyBold, { color: colors.green }]}>
                Aggiunte rapide
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : null}

      <QuickAddonsSheet
        visible={addonsSheetOpen}
        onClose={() => setAddonsSheetOpen(false)}
        title={`Aggiungi a ${info.label}`}
        addons={quickAddons}
        onPick={onAddAddon}
      />

      <MealRowActionsSheet
        visible={actionsMeal !== null}
        meal={actionsMeal}
        onClose={() => setActionsMeal(null)}
        onEdit={() => {
          if (actionsMeal) onEdit(actionsMeal);
          setActionsMeal(null);
        }}
        onSaveAsQuickAddon={() => {
          if (actionsMeal) onSaveRowAsQuickAddon(actionsMeal);
          setActionsMeal(null);
        }}
        onDelete={() => {
          if (actionsMeal) onDelete(actionsMeal.id);
          setActionsMeal(null);
        }}
      />
    </Card>
  );
}

type MealRowProps = {
  meal: Meal;
  onDelete: (id: number) => void;
  onEdit: (meal: Meal) => void;
  onOpenActions: (meal: Meal) => void;
  onSaveAsQuickAddon: (meal: Meal) => void;
  isLast: boolean;
  isFirst: boolean;
  bouncePeek?: boolean;
};

function MealRow({
  meal,
  onDelete,
  onEdit,
  onOpenActions,
  onSaveAsQuickAddon,
  isLast,
  isFirst,
  bouncePeek,
}: MealRowProps) {
  // Bounce peek: anima translateX della prima riga 0 → 28 → 0 con piccolo
  // spring di rientro. Si attiva quando coach mark `rowActions` è attivo,
  // così l'utente vede sbucare l'azione verde "Aggiunta rapida" dietro lo
  // swipe. Si auto-spegne dopo l'animazione (driven dal flag esterno).
  const translateX = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!bouncePeek || !isFirst) return;
    const seq = Animated.sequence([
      Animated.delay(380),
      Animated.timing(translateX, {
        toValue: 28,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.spring(translateX, {
        toValue: 0,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
    ]);
    seq.start();
    return () => {
      seq.stop();
      translateX.setValue(0);
    };
  }, [bouncePeek, isFirst, translateX]);

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
      renderLeftActions={() => (
        <Pressable
          onPress={() => onSaveAsQuickAddon(meal)}
          style={styles.quickAddonAction}
          accessibilityRole="button"
          accessibilityLabel={`Salva ${meal.foodName} come aggiunta rapida`}
        >
          <Icon name="plus" size={16} color={colors.card} />
          <Text style={[typography.bodyBold, { color: colors.card }]}>
            Rapida
          </Text>
        </Pressable>
      )}
      overshootRight={false}
      overshootLeft={false}
    >
      <Animated.View style={{ transform: [{ translateX }] }}>
        <Pressable
          onPress={() => onEdit(meal)}
          onLongPress={() => onOpenActions(meal)}
          delayLongPress={350}
          style={[styles.row, !isLast && styles.rowDivider]}
          accessibilityRole="button"
          accessibilityLabel={`Modifica ${meal.foodName}, tieni premuto per altre opzioni`}
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
          <Pressable
            onPress={() => onOpenActions(meal)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Altre azioni per ${meal.foodName}`}
            style={styles.kebabBtn}
          >
            <Icon name="more" size={16} color={colors.textSec} />
          </Pressable>
        </Pressable>
      </Animated.View>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
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
  heartBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.round,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
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
  addonsTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.greenLight,
    borderWidth: 1.5,
    borderColor: colors.green,
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
  kebabBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAction: {
    width: 96,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    ...shadows.sm,
  },
  quickAddonAction: {
    width: 96,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    ...shadows.sm,
  },
});

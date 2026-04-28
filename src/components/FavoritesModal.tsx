import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { favoritesDB } from '@/database';
import type { Favorite, MealType } from '@/database';
import { colors, radii, shadows, spacing, typography } from '@/theme';

import { MEAL_INFO } from './mealMeta';

type FavoritesModalProps = {
  visible: boolean;
  mealType: MealType;
  onClose: () => void;
  // Called after the user picks a preset; la chiamante aggiunge gli item
  // al diario del giorno corrente sulla sezione mealType.
  onSelect: (favorite: Favorite) => Promise<void> | void;
};

export function FavoritesModal({
  visible,
  mealType,
  onClose,
  onSelect,
}: FavoritesModalProps) {
  const insets = useSafeAreaInsets();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    favoritesDB
      .listFavorites()
      .then(setFavorites)
      .catch(() => setFavorites([]))
      .finally(() => setLoading(false));
  }, [visible]);

  const mealInfo = MEAL_INFO[mealType];

  async function handleSelect(favorite: Favorite) {
    setSubmittingId(favorite.id);
    try {
      await onSelect(favorite);
      onClose();
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            shadows.md,
            { paddingBottom: insets.bottom + spacing.screen },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={typography.label}>Aggiungi da preferiti</Text>
              <Text style={[typography.h1, { color: mealInfo.color }]}>
                {mealInfo.label}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chiudi"
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={8}
            >
              <Icon name="close" size={16} color={colors.textSec} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.placeholder}>
              <ActivityIndicator color={colors.textSec} />
            </View>
          ) : favorites.length === 0 ? (
            <View style={styles.placeholder}>
              <Text style={typography.body}>Nessun pasto salvato</Text>
              <Text style={typography.caption}>
                Salva i tuoi pasti ricorrenti dalla sezione Preferiti.
              </Text>
            </View>
          ) : (
            <FlatList
              data={favorites}
              keyExtractor={(item) => String(item.id)}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => {
                const totalKcal = Math.round(
                  item.items.reduce((sum, it) => sum + it.calories, 0),
                );
                const isSubmitting = submittingId === item.id;
                return (
                  <Pressable
                    onPress={() => handleSelect(item)}
                    disabled={submittingId !== null}
                    style={[styles.row, isSubmitting && styles.rowSubmitting]}
                  >
                    <View style={styles.rowTextCol}>
                      <Text style={typography.body} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={typography.caption} numberOfLines={1}>
                        {item.items.length}{' '}
                        {item.items.length === 1 ? 'alimento' : 'alimenti'} \u00b7{' '}
                        {totalKcal} kcal
                      </Text>
                    </View>
                    <View style={[styles.chip, { backgroundColor: mealInfo.bg }]}>
                      <Text style={[typography.bodyBold, { color: mealInfo.color }]}>
                        Aggiungi
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.screen,
    gap: spacing.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    gap: spacing.xxs,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.round,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    padding: spacing.screen,
    alignItems: 'center',
    gap: spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.xl,
  },
  rowSubmitting: {
    opacity: 0.5,
  },
  rowTextCol: {
    flex: 1,
    gap: spacing.xxs,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.round,
  },
});

import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { foodServingsDB } from '@/database';
import type { FoodServing } from '@/database';
import { colors, radii, shadows, spacing, typography } from '@/theme';

// Editor delle porzioni alternative di un food (es. "fetta = 10 g",
// "cucchiaino = 6 g"). Permette di rinominare, modificare il peso, settare
// la default e cancellare singole porzioni; aggiungere una nuova porzione
// con un mini form inline.

type FoodServingsEditorModalProps = {
  visible: boolean;
  foodId: number | null;
  foodName: string;
  onClose: () => void;
  onChanged?: () => void;
};

const AUTOSAVE_DEBOUNCE_MS = 500;

type DraftRow = {
  id: number;
  labelText: string;
  gramsText: string;
};

type NewDraft = {
  label: string;
  grams: string;
};

const EMPTY_NEW_DRAFT: NewDraft = { label: '', grams: '' };

export function FoodServingsEditorModal({
  visible,
  foodId,
  foodName,
  onClose,
  onChanged,
}: FoodServingsEditorModalProps) {
  const insets = useSafeAreaInsets();
  const [servings, setServings] = useState<FoodServing[]>([]);
  const [drafts, setDrafts] = useState<Record<number, DraftRow>>({});
  const [newDraft, setNewDraft] = useState<NewDraft>(EMPTY_NEW_DRAFT);
  const [savingNew, setSavingNew] = useState(false);

  useEffect(() => {
    if (!visible || foodId === null) {
      setServings([]);
      setDrafts({});
      setNewDraft(EMPTY_NEW_DRAFT);
      return;
    }
    foodServingsDB.listServingsByFood(foodId).then((rows) => {
      setServings(rows);
      setDrafts(buildDrafts(rows));
    });
  }, [visible, foodId]);

  // Autosave per ogni riga: label e grams.
  useEffect(() => {
    if (foodId === null) return;
    const handle = setTimeout(() => {
      servings.forEach((s) => {
        const draft = drafts[s.id];
        if (!draft) return;
        const newLabel = draft.labelText.trim();
        const newGrams = parseGrams(draft.gramsText);
        const labelChanged = newLabel.length > 0 && newLabel !== s.label;
        const gramsChanged = newGrams !== null && Math.abs(newGrams - s.grams) > 0.01;
        if (!labelChanged && !gramsChanged) return;
        const patch: Partial<{ label: string; grams: number }> = {};
        if (labelChanged) patch.label = newLabel;
        if (gramsChanged && newGrams !== null) patch.grams = newGrams;
        foodServingsDB
          .updateServing(s.id, patch)
          .then((next) => {
            if (!next) return;
            setServings((prev) => prev.map((r) => (r.id === next.id ? next : r)));
            onChanged?.();
          })
          .catch(() => undefined);
      });
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [drafts, servings, foodId, onChanged]);

  function handleSetDefault(serving: FoodServing) {
    if (foodId === null) return;
    foodServingsDB.setDefaultServing(foodId, serving.id).then(() => {
      foodServingsDB.listServingsByFood(foodId).then((rows) => {
        setServings(rows);
        setDrafts(buildDrafts(rows));
        onChanged?.();
      });
    });
  }

  function handleDelete(id: number) {
    foodServingsDB.deleteServing(id).then(() => {
      setServings((prev) => prev.filter((s) => s.id !== id));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      onChanged?.();
    });
  }

  function handleCreate() {
    if (foodId === null) return;
    const label = newDraft.label.trim();
    const grams = parseGrams(newDraft.grams);
    if (!label || grams === null) return;
    const isFirst = servings.length === 0;
    setSavingNew(true);
    foodServingsDB
      .createServing({
        foodId,
        label,
        grams,
        isDefault: isFirst,
        position: servings.length,
      })
      .then((created) => {
        setServings((prev) => [...prev, created]);
        setDrafts((prev) => ({
          ...prev,
          [created.id]: {
            id: created.id,
            labelText: created.label,
            gramsText: String(created.grams),
          },
        }));
        setNewDraft(EMPTY_NEW_DRAFT);
        onChanged?.();
      })
      .catch(() => undefined)
      .finally(() => setSavingNew(false));
  }

  const canCreate =
    newDraft.label.trim().length > 0 &&
    parseGrams(newDraft.grams) !== null &&
    !savingNew;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
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
              <Text style={typography.label}>Porzioni di</Text>
              <Text style={typography.h1} numberOfLines={2}>
                {foodName}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Chiudi"
            >
              <Icon name="close" size={16} color={colors.textSec} />
            </Pressable>
          </View>

          <Text style={typography.caption}>
            Aggiungi porzioni alternative come "fetta", "cucchiaino" o
            "porzione" per inserire più velocemente questo alimento.
          </Text>

          <View style={styles.list}>
            {servings.length === 0 ? (
              <Text style={[typography.caption, styles.empty]}>
                Nessuna porzione configurata.
              </Text>
            ) : (
              servings.map((serving, idx) => {
                const draft = drafts[serving.id];
                return (
                  <View
                    key={serving.id}
                    style={[
                      styles.row,
                      idx < servings.length - 1 && styles.rowDivider,
                    ]}
                  >
                    <Pressable
                      onPress={() => handleSetDefault(serving)}
                      style={[
                        styles.starBtn,
                        serving.isDefault && styles.starBtnActive,
                      ]}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={
                        serving.isDefault
                          ? 'Porzione predefinita'
                          : `Imposta ${serving.label} come predefinita`
                      }
                    >
                      <Icon
                        name="check"
                        size={12}
                        color={serving.isDefault ? colors.card : colors.textSec}
                      />
                    </Pressable>
                    <TextInput
                      value={draft?.labelText ?? serving.label}
                      onChangeText={(text) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [serving.id]: {
                            id: serving.id,
                            labelText: text,
                            gramsText: prev[serving.id]?.gramsText ?? String(serving.grams),
                          },
                        }))
                      }
                      style={[styles.labelInput, typography.body]}
                      placeholder="Nome"
                      placeholderTextColor={colors.textSec}
                    />
                    <TextInput
                      value={draft?.gramsText ?? String(serving.grams)}
                      onChangeText={(text) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [serving.id]: {
                            id: serving.id,
                            labelText: prev[serving.id]?.labelText ?? serving.label,
                            gramsText: text,
                          },
                        }))
                      }
                      keyboardType="decimal-pad"
                      style={[styles.gramsInput, typography.bodyBold]}
                      placeholder="0"
                      placeholderTextColor={colors.textSec}
                    />
                    <Text style={[typography.caption, styles.unit]}>g</Text>
                    <Pressable
                      onPress={() => handleDelete(serving.id)}
                      style={styles.delBtn}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Elimina ${serving.label}`}
                    >
                      <Icon name="trash" size={14} color={colors.red} />
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>

          <View style={styles.newRow}>
            <TextInput
              value={newDraft.label}
              onChangeText={(text) => setNewDraft((prev) => ({ ...prev, label: text }))}
              placeholder="Nuova porzione (es. cucchiaino)"
              placeholderTextColor={colors.textSec}
              style={[styles.labelInput, typography.body]}
            />
            <TextInput
              value={newDraft.grams}
              onChangeText={(text) => setNewDraft((prev) => ({ ...prev, grams: text }))}
              keyboardType="decimal-pad"
              placeholder="g"
              placeholderTextColor={colors.textSec}
              style={[styles.gramsInput, typography.bodyBold]}
            />
            <Pressable
              onPress={handleCreate}
              disabled={!canCreate}
              style={[styles.addBtn, !canCreate && styles.addBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Aggiungi porzione"
            >
              <Icon name="plus" size={14} color={colors.card} />
            </Pressable>
          </View>

          <Button label="Fatto" variant="secondary" onPress={onClose} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function buildDrafts(rows: FoodServing[]): Record<number, DraftRow> {
  const map: Record<number, DraftRow> = {};
  for (const r of rows) {
    map[r.id] = { id: r.id, labelText: r.label, gramsText: String(r.grams) };
  }
  return map;
}

function parseGrams(raw: string): number | null {
  const n = Number(String(raw).replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0 || n > 5000) return null;
  return n;
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
  list: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
  },
  empty: {
    paddingVertical: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  starBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.round,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starBtnActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  labelInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  gramsInput: {
    width: 56,
    color: colors.text,
    textAlign: 'right',
    paddingVertical: spacing.xs,
  },
  unit: {
    color: colors.textSec,
  },
  delBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.round,
    backgroundColor: colors.redLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.greenLight,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.green,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.round,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
});

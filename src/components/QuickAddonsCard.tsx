import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { quickAddonsDB } from '@/database';
import type { QuickAddon } from '@/database';
import { colors, radii, spacing, typography } from '@/theme';

// Card editor degli "addon rapidi" (es. Contorno verdure 50 kcal, Olio in
// cottura 80 kcal). L'utente può aggiungerne quanti ne vuole; ogni voce è poi
// disponibile come scorciatoia in Home e nei preferiti per aggiungere calorie
// fisse senza ricerca.

const AUTOSAVE_DEBOUNCE_MS = 600;

type DraftRow = {
  id: number;
  labelText: string;
  caloriesText: string;
};

type NewDraft = {
  label: string;
  calories: string;
};

const EMPTY_NEW_DRAFT: NewDraft = { label: '', calories: '' };

export function QuickAddonsCard() {
  const [addons, setAddons] = useState<QuickAddon[]>([]);
  const [drafts, setDrafts] = useState<Record<number, DraftRow>>({});
  const [newDraft, setNewDraft] = useState<NewDraft>(EMPTY_NEW_DRAFT);
  const [savingNew, setSavingNew] = useState(false);

  useEffect(() => {
    quickAddonsDB.listAddons().then((rows) => {
      setAddons(rows);
      setDrafts(buildDrafts(rows));
    });
  }, []);

  // Autosave: ogni riga ha il suo timer indipendente. Quando l'utente
  // smette di scrivere per 600ms aggiorniamo il record corrispondente.
  useEffect(() => {
    const handle = setTimeout(() => {
      addons.forEach((addon) => {
        const draft = drafts[addon.id];
        if (!draft) return;
        const labelChanged = draft.labelText.trim() !== addon.label;
        const calNum = parseCalories(draft.caloriesText);
        const caloriesChanged = calNum !== null && calNum !== addon.calories;
        if (!labelChanged && !caloriesChanged) return;
        if (labelChanged && draft.labelText.trim().length === 0) return;
        const patch: Partial<{ label: string; calories: number }> = {};
        if (labelChanged) patch.label = draft.labelText.trim();
        if (caloriesChanged && calNum !== null) patch.calories = calNum;
        quickAddonsDB
          .updateAddon(addon.id, patch)
          .then((next) => {
            if (!next) return;
            setAddons((prev) => prev.map((a) => (a.id === next.id ? next : a)));
          })
          .catch(() => undefined);
      });
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [drafts, addons]);

  function handleDelete(id: number) {
    quickAddonsDB.deleteAddon(id).then(() => {
      setAddons((prev) => prev.filter((a) => a.id !== id));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });
  }

  function handleCreate() {
    const label = newDraft.label.trim();
    const calories = parseCalories(newDraft.calories);
    if (!label || calories === null) return;
    setSavingNew(true);
    quickAddonsDB
      .createAddon({ label, calories })
      .then((created) => {
        setAddons((prev) => [...prev, created]);
        setDrafts((prev) => ({
          ...prev,
          [created.id]: {
            id: created.id,
            labelText: created.label,
            caloriesText: String(created.calories),
          },
        }));
        setNewDraft(EMPTY_NEW_DRAFT);
      })
      .finally(() => setSavingNew(false));
  }

  const canCreate =
    newDraft.label.trim().length > 0 &&
    parseCalories(newDraft.calories) !== null &&
    !savingNew;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={typography.label}>Aggiunte rapide</Text>
        <Text style={typography.caption}>
          Calorie fisse pronte da aggiungere a un pasto (es. contorno, olio,
          caffè zuccherato).
        </Text>
      </View>

      <View style={styles.list}>
        {addons.length === 0 ? (
          <Text style={[typography.caption, styles.empty]}>
            Nessuna aggiunta rapida configurata.
          </Text>
        ) : (
          addons.map((addon, idx) => {
            const draft = drafts[addon.id];
            return (
              <View
                key={addon.id}
                style={[styles.row, idx < addons.length - 1 && styles.rowDivider]}
              >
                <TextInput
                  value={draft?.labelText ?? addon.label}
                  onChangeText={(text) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [addon.id]: {
                        id: addon.id,
                        labelText: text,
                        caloriesText: prev[addon.id]?.caloriesText ?? String(addon.calories),
                      },
                    }))
                  }
                  style={[styles.labelInput, typography.body]}
                  placeholder="Nome"
                  placeholderTextColor={colors.textSec}
                />
                <TextInput
                  value={draft?.caloriesText ?? String(addon.calories)}
                  onChangeText={(text) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [addon.id]: {
                        id: addon.id,
                        labelText: prev[addon.id]?.labelText ?? addon.label,
                        caloriesText: text,
                      },
                    }))
                  }
                  keyboardType="decimal-pad"
                  style={[styles.caloriesInput, typography.bodyBold]}
                  placeholder="0"
                  placeholderTextColor={colors.textSec}
                />
                <Text style={[typography.caption, styles.unit]}>kcal</Text>
                <Pressable
                  onPress={() => handleDelete(addon.id)}
                  style={styles.delBtn}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Elimina ${addon.label}`}
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
          placeholder="Nuova aggiunta"
          placeholderTextColor={colors.textSec}
          style={[styles.labelInput, typography.body]}
        />
        <TextInput
          value={newDraft.calories}
          onChangeText={(text) => setNewDraft((prev) => ({ ...prev, calories: text }))}
          keyboardType="decimal-pad"
          placeholder="kcal"
          placeholderTextColor={colors.textSec}
          style={[styles.caloriesInput, typography.bodyBold]}
        />
        <Pressable
          onPress={handleCreate}
          disabled={!canCreate}
          style={[styles.addBtn, !canCreate && styles.addBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Aggiungi nuova"
        >
          <Icon name="plus" size={14} color={colors.card} />
        </Pressable>
      </View>
    </Card>
  );
}

function buildDrafts(rows: QuickAddon[]): Record<number, DraftRow> {
  const map: Record<number, DraftRow> = {};
  for (const r of rows) {
    map[r.id] = {
      id: r.id,
      labelText: r.label,
      caloriesText: String(r.calories),
    };
  }
  return map;
}

function parseCalories(raw: string): number | null {
  const n = Number(String(raw).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > 5000) return null;
  return n;
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.screen,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.xxs,
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
  labelInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  caloriesInput: {
    width: 64,
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

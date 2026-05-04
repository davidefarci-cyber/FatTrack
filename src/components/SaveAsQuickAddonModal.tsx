import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/Input';
import type { NewQuickAddon } from '@/database';
import { colors, radii, shadows, spacing, typography } from '@/theme';

// Modal compatto per salvare un alimento del log come "aggiunta rapida"
// (calorie fisse). Precompila nome e kcal dalla riga sorgente; l'utente può
// accorciare il nome ("Mandorle 30 g" → "Mandorle") prima di confermare.
// Persistenza demandata al caller via `onConfirm`.

type Props = {
  visible: boolean;
  defaultLabel: string;
  defaultCalories: number;
  onClose: () => void;
  onConfirm: (input: NewQuickAddon) => Promise<void>;
};

export function SaveAsQuickAddonModal({
  visible,
  defaultLabel,
  defaultCalories,
  onClose,
  onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const [label, setLabel] = useState(defaultLabel);
  const [caloriesText, setCaloriesText] = useState(
    String(Math.round(defaultCalories)),
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLabel(defaultLabel);
    setCaloriesText(String(Math.round(defaultCalories)));
    setSubmitting(false);
  }, [visible, defaultLabel, defaultCalories]);

  const calories = parseCalories(caloriesText);
  const trimmed = label.trim();
  const canConfirm =
    trimmed.length > 0 && calories !== null && !submitting;

  const handleConfirm = useCallback(async () => {
    if (!canConfirm || calories === null) return;
    setSubmitting(true);
    try {
      await onConfirm({ label: trimmed, calories });
    } finally {
      setSubmitting(false);
    }
  }, [canConfirm, calories, trimmed, onConfirm]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.card,
            shadows.md,
            { marginBottom: insets.bottom + spacing.screen },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={typography.label}>Aggiungi a aggiunte rapide</Text>
              <Text style={[typography.h1, { color: colors.green }]}>
                Calorie fisse
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
            Le aggiunte rapide sono porzioni a calorie fisse, da inserire con
            un tap in qualsiasi pasto. Puoi accorciare il nome se preferisci.
          </Text>

          <Input
            label="Nome"
            value={label}
            onChangeText={setLabel}
            autoCapitalize="sentences"
            placeholder="Es. Mandorle"
          />
          <Input
            label="Calorie"
            unit="kcal"
            keyboardType="decimal-pad"
            value={caloriesText}
            onChangeText={setCaloriesText}
            placeholder="80"
          />

          <Button
            label="Salva aggiunta rapida"
            onPress={handleConfirm}
            disabled={!canConfirm}
            loading={submitting}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function parseCalories(raw: string): number | null {
  const n = Number(String(raw).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > 5000) return null;
  return n;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.screen,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xxl,
    padding: spacing.screen,
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
});

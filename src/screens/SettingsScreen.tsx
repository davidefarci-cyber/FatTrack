import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { QuickAddonsCard } from '@/components/QuickAddonsCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useToast } from '@/components/Toast';
import { mealsStore, resetDatabase } from '@/database';
import { useProfile } from '@/hooks/useProfile';
import { colors, radii, spacing, typography } from '@/theme';
import { exportBackup, importBackup } from '@/utils/dbBackup';
import { manualCheckForUpdate } from '@/utils/updateChecker';
import type { TabParamList } from '@/types';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const { profile, deleteProfile, reload: reloadProfile, loading: profileLoading } = useProfile();
  const [resetting, setResetting] = useState(false);
  const [resettingDb, setResettingDb] = useState(false);

  const handleReset = () => {
    Alert.alert(
      'Reset app',
      'Verrà cancellato il profilo e tornerai all’onboarding. I pasti e i preferiti restano nel database. Vuoi procedere?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            try {
              await deleteProfile();
              toast.show('App resettata');
            } finally {
              setResetting(false);
            }
          },
        },
      ],
    );
  };

  const handleResetDb = () => {
    Alert.alert(
      'Reset completo del database',
      'Cancella tutto: profilo, pasti, preferiti, aggiunte rapide. Il DB ripartira’ da zero (food default + aggiunte rapide riseminate). Vuoi procedere?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Cancella tutto',
          style: 'destructive',
          onPress: async () => {
            setResettingDb(true);
            try {
              await resetDatabase();
              mealsStore.clearCache();
              await reloadProfile();
              toast.show('Database resettato');
            } finally {
              setResettingDb(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Impostazioni"
        subtitle="Aggiunte rapide, backup e manutenzione"
        style={{ paddingTop: insets.top + spacing.xl }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.screen * 2 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {profileLoading ? (
          <Card style={styles.card}>
            <Text style={typography.body}>Caricamento…</Text>
          </Card>
        ) : (
          <>
            <ProfileShortcut
              name={profile?.name ?? null}
              onPress={() => navigation.navigate('Profile')}
            />

            <QuickAddonsCard />

            <VersionCard />

            <BackupCard onAfterImport={reloadProfile} />

            <Card style={styles.card}>
              <Text style={typography.label}>Test</Text>
              <Text style={typography.caption}>
                Cancella il profilo per ricominciare dall’onboarding. Utile
                durante lo sviluppo; pasti e preferiti restano intatti.
              </Text>
              <Button
                label="Reset app (torna all’onboarding)"
                variant="secondary"
                onPress={handleReset}
                loading={resetting}
              />
              <Text style={typography.caption}>
                Reset totale: cancella anche pasti, preferiti e aggiunte
                rapide. Il database riparte da zero con i food e le aggiunte
                rapide di default.
              </Text>
              <Button
                label="Reset DB (azzera tutto)"
                variant="secondary"
                onPress={handleResetDb}
                loading={resettingDb}
              />
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ProfileShortcut({
  name,
  onPress,
}: {
  name: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Apri profilo"
      style={({ pressed }) => [styles.profileShortcut, pressed && styles.profileShortcutPressed]}
    >
      <View style={styles.profileShortcutAvatar}>
        <Icon name="user" size={22} color={colors.green} />
      </View>
      <View style={styles.profileShortcutText}>
        <Text style={typography.bodyBold}>
          {name && name.trim().length > 0 ? name : 'Il tuo profilo'}
        </Text>
        <Text style={typography.caption}>Peso, dati personali, obiettivo</Text>
      </View>
      <Icon name="chevron-right" size={18} color={colors.textSec} />
    </Pressable>
  );
}

function VersionCard() {
  const nativeVersion = Constants.expoConfig?.version ?? '—';
  const toast = useToast();
  const [checking, setChecking] = useState(false);

  async function handleCheck() {
    if (checking) return;
    setChecking(true);
    try {
      const result = await manualCheckForUpdate();
      if (result === 'up-to-date') {
        toast.show("L'app è già aggiornata.");
      } else if (result === 'error') {
        toast.show('Impossibile verificare. Riprova più tardi.');
      }
      // 'prompted': l'Alert si apre da solo, niente toast.
    } finally {
      setChecking(false);
    }
  }

  return (
    <Card style={styles.card}>
      <Text style={typography.label}>Versione app</Text>
      <View style={styles.versionRow}>
        <Text style={typography.caption}>App</Text>
        <Text style={styles.versionValue}>{nativeVersion}</Text>
      </View>
      <Button
        label="Cerca aggiornamenti"
        variant="secondary"
        onPress={handleCheck}
        loading={checking}
      />
    </Card>
  );
}

function BackupCard({ onAfterImport }: { onAfterImport: () => Promise<void> }) {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const result = await exportBackup();
      if (result.kind === 'unavailable') {
        toast.show('Condivisione non disponibile su questo dispositivo');
      } else if (result.kind === 'error') {
        toast.show(`Errore export: ${result.message}`);
      }
      // 'shared': lo share-sheet di sistema gestisce il feedback.
    } finally {
      setExporting(false);
    }
  }

  function handleImport() {
    if (importing) return;
    Alert.alert(
      'Importa backup',
      'Sostituirà TUTTI i dati attuali (profilo, pasti, preferiti, food, aggiunte rapide). Vuoi procedere?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Importa',
          style: 'destructive',
          onPress: async () => {
            setImporting(true);
            try {
              const result = await importBackup();
              if (result.kind === 'imported') {
                await onAfterImport();
                const total = Object.values(result.report.imported).reduce(
                  (a, b) => a + b,
                  0,
                );
                if (result.report.warnings.length > 0) {
                  Alert.alert(
                    `Backup importato (${total} righe)`,
                    `Alcuni dati non sono stati ripristinati:\n\n• ${result.report.warnings.join('\n• ')}`,
                  );
                } else {
                  toast.show(`Backup importato (${total} righe)`);
                }
              } else if (result.kind === 'invalid') {
                toast.show(`Backup non valido: ${result.reason}`);
              }
              // 'cancelled': nessun feedback necessario.
            } finally {
              setImporting(false);
            }
          },
        },
      ],
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={typography.label}>Backup database</Text>
      <Text style={typography.caption}>
        Esporta tutti i tuoi dati (profilo, pasti, preferiti, food, aggiunte
        rapide) in un file JSON da salvare su cloud o trasferire su un altro
        telefono. L'import sostituisce i dati attuali.
      </Text>
      <Button
        label="Esporta backup"
        variant="secondary"
        onPress={handleExport}
        loading={exporting}
      />
      <Button
        label="Importa backup"
        variant="secondary"
        onPress={handleImport}
        loading={importing}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    padding: spacing.screen,
    gap: spacing.screen,
  },
  card: {
    padding: spacing.screen,
    gap: spacing.xl,
  },
  profileShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    backgroundColor: colors.card,
    borderRadius: radii.xxl,
    padding: spacing.screen,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileShortcutPressed: {
    backgroundColor: colors.bg,
  },
  profileShortcutAvatar: {
    width: 40,
    height: 40,
    borderRadius: radii.round,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileShortcutText: {
    flex: 1,
    gap: spacing.xxs,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  versionValue: {
    ...typography.bodyBold,
    color: colors.text,
  },
});

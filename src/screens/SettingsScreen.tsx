import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { usePreferences } from '@/hooks/usePreferences';
import { colors, spacing, typography } from '@/theme';

// Placeholder: impostazioni. Form profilo completo verrà costruito
// nei prompt successivi sopra useProfile + Input (già stilato).
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { preferences, loading } = usePreferences();

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Impostazioni"
        subtitle="Il tuo profilo e le preferenze"
        style={{ paddingTop: insets.top + spacing.xl }}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <Text style={typography.label}>Preferenze correnti</Text>
          {loading ? (
            <Text style={typography.body}>Caricamento…</Text>
          ) : (
            <View style={styles.list}>
              <Row label="Obiettivo kcal" value={`${preferences.dailyKcalTarget}`} />
              <Row label="Obiettivo grassi" value={`${preferences.dailyFatTargetG} g`} />
              <Row label="Unità" value={preferences.units} />
              <Row label="Tema" value={preferences.theme} />
            </View>
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={typography.caption}>{label}</Text>
      <Text style={typography.bodyBold}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    padding: spacing.screen,
    paddingBottom: spacing.screen * 2,
    gap: spacing.screen,
  },
  card: {
    padding: spacing.screen,
    gap: spacing.xl,
  },
  list: {
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

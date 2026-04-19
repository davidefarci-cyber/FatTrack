import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, spacing, typography } from '@/theme';

// Placeholder: storico/statistiche. Grafici e aggregazioni verranno aggiunti
// nei prompt successivi interrogando mealsDB.sumCaloriesByDate ecc.
export default function HistoryScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Storico"
        subtitle="Andamento delle tue calorie"
        style={{ paddingTop: insets.top + spacing.xl }}
      />
      <View style={styles.body}>
        <Card style={styles.card}>
          <Text style={typography.body}>Nessun dato da mostrare.</Text>
          <Text style={[typography.caption, styles.hint]}>
            Registra qualche pasto per vedere qui il grafico settimanale.
          </Text>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  body: {
    flex: 1,
    padding: spacing.screen,
  },
  card: {
    padding: spacing.screen,
    gap: spacing.sm,
  },
  hint: {
    marginTop: spacing.xs,
  },
});

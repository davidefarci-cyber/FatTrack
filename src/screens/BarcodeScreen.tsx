import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, spacing, typography } from '@/theme';

// Placeholder: scanner barcode. La logica Expo Camera + expo-barcode-scanner
// verrà aggiunta nei prompt successivi usando questi wrapper di design.
export default function BarcodeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Scansiona"
        subtitle="Inquadra il codice a barre"
        style={{ paddingTop: insets.top + spacing.xl }}
      />
      <View style={styles.body}>
        <Card style={styles.card}>
          <Text style={typography.body}>Fotocamera non ancora collegata.</Text>
          <Text style={[typography.caption, styles.hint]}>
            Verrà integrata Expo Camera in un prompt dedicato.
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

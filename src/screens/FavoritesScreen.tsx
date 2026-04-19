import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, spacing, typography } from '@/theme';

// Placeholder: lista dei preferiti. Popolata nei prompt successivi
// interrogando favoritesDB.
export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Preferiti"
        subtitle="I tuoi pasti salvati"
        style={{ paddingTop: insets.top + spacing.xl }}
      />
      <View style={styles.body}>
        <Card style={styles.card}>
          <Text style={typography.body}>Nessun preferito ancora.</Text>
          <Text style={[typography.caption, styles.hint]}>
            Salva un pasto dal diario per trovarlo qui.
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

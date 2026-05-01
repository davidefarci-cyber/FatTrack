import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, spacing, typography } from '@/theme';

// Placeholder Fase 1: contenuto reale (lista schede + editor + preset) in
// Fase 2.
export default function WorkoutsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Schede"
        subtitle="Le tue routine + preset"
        style={{ paddingTop: insets.top + spacing.xl }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.screen * 2 },
        ]}
      >
        <Card style={styles.card}>
          <Text style={typography.label}>In arrivo</Text>
          <Text style={typography.caption}>
            Disponibile nella prossima fase.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.screen, gap: spacing.screen },
  card: { padding: spacing.screen, gap: spacing.xl },
});

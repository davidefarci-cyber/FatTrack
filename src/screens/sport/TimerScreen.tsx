import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, spacing, typography } from '@/theme';

// Placeholder Fase 1: serve solo a verificare che il tema arancio si applichi
// correttamente. Il contenuto reale arriva in Fase 3 (timer Tabata /
// intervalli / libero, riusando l'engine della sessione live).
export default function TimerScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Timer"
        subtitle="Tabata, intervalli, conteggio libero"
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

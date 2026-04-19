import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalorieRing } from '@/components/CalorieRing';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, spacing, typography } from '@/theme';

// Placeholder: la schermata verrà riempita dai prompt successivi.
// Usa già i token di design (colors, spacing, typography) e i componenti
// condivisi (ScreenHeader, Card, CalorieRing) come base obbligata.
export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Ciao!"
        subtitle="Ecco il riepilogo di oggi"
        style={{ paddingTop: insets.top + spacing.xl }}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.ringCard}>
          <Text style={typography.label}>Calorie di oggi</Text>
          <View style={styles.ringWrap}>
            <CalorieRing consumed={0} target={2000} />
          </View>
        </Card>
      </ScrollView>
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
  ringCard: {
    padding: spacing.screen,
    alignItems: 'center',
    gap: spacing.xxl,
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

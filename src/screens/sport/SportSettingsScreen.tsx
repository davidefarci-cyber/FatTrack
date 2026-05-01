import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAppSettings } from '@/hooks/useAppSettings';
import { colors, spacing, typography } from '@/theme';

// Placeholder Fase 1: solo il toggle inverso "Torna a modalità Dieta".
// In Fase 5 valutiamo se servono altre voci; per ora SportSettings è una
// schermata minima raggiungibile dal cog di SportHomeScreen.
export default function SportSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { setAppMode } = useAppSettings();

  function handleSwitchToDiet() {
    Alert.alert(
      'Torna a modalità Dieta?',
      'Tornerai alla home con il tracking calorico. Potrai sempre rientrare in Sport tenendo premuto Home o dalle impostazioni Dieta.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Torna a Dieta',
          onPress: () => {
            void setAppMode('diet');
          },
        },
      ],
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Impostazioni"
        subtitle="Modalità sport"
        style={{ paddingTop: insets.top + spacing.xl }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.screen * 2 },
        ]}
      >
        <Card style={styles.card}>
          <Text style={typography.label}>Modalità app</Text>
          <Text style={typography.caption}>
            Stai usando la modalità Sport. Le impostazioni dedicate
            (preferenze allenamento, suoni, notifiche) arriveranno nelle
            prossime fasi.
          </Text>
          <Button
            label="Torna a modalità Dieta"
            variant="secondary"
            onPress={handleSwitchToDiet}
          />
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

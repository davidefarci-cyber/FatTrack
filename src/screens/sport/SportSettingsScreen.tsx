import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAppSettings } from '@/hooks/useAppSettings';
import { colors, radii, spacing, typography } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';

const WEEKLY_TARGET_OPTIONS = [1, 2, 3, 4, 5, 6, 7] as const;

// SportSettings:
// - Obiettivo settimanale (Fase 5C): scelta 1..7 con tap, persistito in
//   app_settings.weekly_target_days. La dashboard sport (`useSportStats`)
//   legge dallo stesso store, così cambiando il valore qui la home sport
//   si aggiorna al prossimo render.
// - Modalità app: toggle inverso "Torna a modalità Dieta" già da Fase 1.
export default function SportSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { setAppMode, weeklyTargetDays, setWeeklyTarget } = useAppSettings();
  const theme = useAppTheme();

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
          <Text style={typography.label}>Obiettivo settimanale</Text>
          <Text style={[typography.body, styles.cardTitle]}>
            Giorni di allenamento target
          </Text>
          <View style={styles.targetRow}>
            {WEEKLY_TARGET_OPTIONS.map((value) => {
              const selected = value === weeklyTargetDays;
              return (
                <Pressable
                  key={value}
                  onPress={() => {
                    if (!selected) void setWeeklyTarget(value);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Imposta obiettivo a ${value} giorni`}
                  accessibilityState={{ selected }}
                  style={[
                    styles.targetBtn,
                    selected
                      ? { backgroundColor: theme.accent, borderColor: theme.accent }
                      : { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.targetLabel,
                      { color: selected ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {value}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={typography.caption}>
            La dashboard mostrerà i progressi rispetto a questo obiettivo.
          </Text>
        </Card>

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
  cardTitle: {
    marginTop: -spacing.sm,
  },
  targetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  targetBtn: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radii.round,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetLabel: {
    ...typography.bodyBold,
    fontSize: 15,
  },
});

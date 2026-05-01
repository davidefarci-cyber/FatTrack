import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { APP_NAME_SPORT, colors, spacing, typography } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import type { SportTabParamList } from '@/types';

// Placeholder Fase 1: la dashboard reale (scheda di oggi, settimana,
// ultimo allenamento, "Inizia ora") arriva in Fase 4. Qui mostriamo il
// wordmark FitTrack e l'accent arancio per dimostrare che il tema si
// applica correttamente, più il cog per raggiungere SportSettings (analogo
// a HomeScreen diet).
export default function SportHomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<BottomTabNavigationProp<SportTabParamList>>();
  const { accent } = useAppTheme();

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={APP_NAME_SPORT}
        subtitle="Modalità sport"
        style={{ paddingTop: insets.top + spacing.xl }}
        right={
          <Pressable
            onPress={() => navigation.navigate('SportSettings')}
            accessibilityRole="button"
            accessibilityLabel="Apri impostazioni sport"
            hitSlop={8}
          >
            <Icon name="cog" size={22} color={colors.textSec} />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.screen * 2 },
        ]}
      >
        <Card style={styles.card}>
          <View style={styles.row}>
            <Icon name="bolt" size={22} color={accent} />
            <Text style={typography.bodyBold}>Allenamento di oggi</Text>
          </View>
          <Text style={typography.caption}>
            La dashboard arriva nella prossima fase: scheda preselezionata,
            settimana, ultimo allenamento.
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
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
});

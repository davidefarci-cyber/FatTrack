import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { WheelPicker } from '@/components/WheelPicker';
import { colors, spacing, typography } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';

// Personalizzazione del Tabata (work / rest / round). Coerente con altri
// modal sport (BottomSheet alto). Tre WheelPicker affiancati con range
// uguali a quanto introdotto in C1, riepilogo durata totale calcolato
// in tempo reale. La persistenza DB è responsabilità del consumer
// (TabataScreen) che riceve la nuova config in `onSave` e chiama
// `setTabataConfig`.

export type TabataConfig = {
  workSec: number;
  restSec: number;
  rounds: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  initialConfig: TabataConfig;
  onSave: (config: TabataConfig) => void;
};

export function TabataConfigModal({
  visible,
  onClose,
  initialConfig,
  onSave,
}: Props) {
  const theme = useAppTheme();
  const [workSec, setWorkSec] = useState(initialConfig.workSec);
  const [restSec, setRestSec] = useState(initialConfig.restSec);
  const [rounds, setRounds] = useState(initialConfig.rounds);

  // Resync con i valori in DB ogni volta che il modal si riapre. Evita
  // che l'utente veda una stale config se nel frattempo qualcuno ha
  // chiamato setTabataConfig altrove.
  useEffect(() => {
    if (!visible) return;
    setWorkSec(initialConfig.workSec);
    setRestSec(initialConfig.restSec);
    setRounds(initialConfig.rounds);
  }, [visible, initialConfig.workSec, initialConfig.restSec, initialConfig.rounds]);

  const totalSec = (workSec + restSec) * rounds;
  const totalMin = Math.floor(totalSec / 60);
  const totalRemSec = totalSec % 60;

  const handleSave = () => {
    onSave({ workSec, restSec, rounds });
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightPercent={87}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={typography.h1}>Personalizza il tuo Tabata</Text>
          <Text style={[typography.caption, styles.subtitle]}>
            I valori vengono salvati per le prossime sessioni.
          </Text>
        </View>

        <View style={styles.pickerRow}>
          <View style={styles.pickerCol}>
            <Text style={typography.label}>Lavoro</Text>
            <WheelPicker
              value={workSec}
              onChange={setWorkSec}
              min={5}
              max={300}
              step={5}
              suffix="sec"
              accent={theme.accent}
            />
          </View>
          <View style={styles.pickerCol}>
            <Text style={typography.label}>Recupero</Text>
            <WheelPicker
              value={restSec}
              onChange={setRestSec}
              min={5}
              max={300}
              step={5}
              suffix="sec"
              accent={theme.accent}
            />
          </View>
          <View style={styles.pickerCol}>
            <Text style={typography.label}>Round</Text>
            <WheelPicker
              value={rounds}
              onChange={setRounds}
              min={1}
              max={30}
              step={1}
              suffix="round"
              accent={theme.accent}
            />
          </View>
        </View>

        <Card style={styles.summary}>
          <Text style={typography.label}>Durata totale</Text>
          <Text style={[styles.summaryValue, { color: theme.accent }]}>
            {formatDuration(totalMin, totalRemSec)}
          </Text>
          <Text style={typography.caption}>
            {`${rounds} × (${workSec}s lavoro + ${restSec}s recupero)`}
          </Text>
        </Card>

        <View style={styles.actions}>
          <Button label="Annulla" variant="secondary" onPress={onClose} />
          <Button
            label="Salva"
            onPress={handleSave}
            style={{ backgroundColor: theme.accent }}
          />
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

function formatDuration(min: number, sec: number): string {
  if (min === 0) return `${sec} sec`;
  if (sec === 0) return `${min} min`;
  return `${min} min ${sec} sec`;
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.screen,
    gap: spacing.screen,
  },
  header: {
    gap: spacing.xs,
  },
  subtitle: {
    color: colors.textSec,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-around',
  },
  pickerCol: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  summary: {
    padding: spacing.screen,
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryValue: {
    ...typography.display,
  },
  actions: {
    gap: spacing.md,
  },
});

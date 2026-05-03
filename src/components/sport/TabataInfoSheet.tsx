import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { colors, spacing, typography } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';

// Spiegazione divulgativa del protocollo Tabata: chi era Izumi Tabata,
// lo studio originale del 1996, perché il formato funziona, distinzione
// "Tabata vero" vs HIIT generico. Aperta dall'icona info nell'header
// di TabataScreen. Layout testuale puro su BottomSheet alto, contenuto
// in italiano.

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function TabataInfoSheet({ visible, onClose }: Props) {
  const theme = useAppTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightPercent={87}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={typography.h1}>Cos'è il Tabata</Text>
        <Text style={styles.body}>
          Il Tabata è un protocollo di allenamento HIIT (High-Intensity
          Interval Training) sviluppato dal Dr. Izumi Tabata negli
          anni '90 per la nazionale giapponese di pattinaggio di
          velocità.
        </Text>
        <Text style={styles.body}>
          Il formato è semplice:{' '}
          <Text style={styles.strong}>
            8 round da 20 secondi di lavoro all'intensità massima,
            intervallati da 10 secondi di recupero
          </Text>
          . In totale, 4 minuti di allenamento.
        </Text>

        <Text style={[typography.h1, styles.section]}>Perché funziona</Text>
        <Text style={styles.body}>
          Lo studio originale di Tabata et al. (1996,{' '}
          <Text style={styles.italic}>
            Medicine and Science in Sports and Exercise
          </Text>
          ) ha confrontato due gruppi di atleti su 6 settimane di
          allenamento:
        </Text>

        <View style={styles.bullet}>
          <View style={[styles.dot, { backgroundColor: theme.accent }]} />
          <Text style={styles.body}>
            <Text style={styles.strong}>Gruppo A</Text>: 60 minuti di
            cardio steady-state (70% VO₂max), 5 volte a settimana.
          </Text>
        </View>
        <View style={styles.bullet}>
          <View style={[styles.dot, { backgroundColor: theme.accent }]} />
          <Text style={styles.body}>
            <Text style={styles.strong}>Gruppo B</Text>: 4 minuti di
            Tabata, 5 volte a settimana.
          </Text>
        </View>

        <Text style={styles.body}>Il gruppo B ha mostrato:</Text>
        <View style={styles.bullet}>
          <View style={[styles.dot, { backgroundColor: theme.accent }]} />
          <Text style={styles.body}>
            <Text style={styles.strong}>+28%</Text> capacità anaerobica
          </Text>
        </View>
        <View style={styles.bullet}>
          <View style={[styles.dot, { backgroundColor: theme.accent }]} />
          <Text style={styles.body}>
            <Text style={styles.strong}>+14%</Text> VO₂max (capacità
            aerobica)
          </Text>
        </View>
        <Text style={styles.body}>
          Il gruppo A ha migliorato l'aerobica ma non l'anaerobica.
        </Text>

        <Text style={[typography.h1, styles.section]}>
          Tabata vero vs HIIT generico
        </Text>
        <Text style={styles.body}>
          Molti chiamano "Tabata" qualunque allenamento intervallato.
          Il vero Tabata richiede{' '}
          <Text style={styles.strong}>intensità massimale</Text>{' '}
          (~170% VO₂max, al limite del possibile) per ogni round.
          Senza quella intensità, è un HIIT efficace ma non è "Tabata".
        </Text>

        <View style={styles.actions}>
          <Button label="Chiudi" variant="secondary" onPress={onClose} />
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.screen,
    gap: spacing.md,
  },
  body: {
    ...typography.body,
    color: colors.text,
  },
  strong: {
    fontFamily: typography.bodyBold.fontFamily,
  },
  italic: {
    fontStyle: 'italic',
  },
  section: {
    marginTop: spacing.md,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingLeft: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
});

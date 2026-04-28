import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Icon } from '@/components/Icon';
import type { Food, FoodSource } from '@/database';
import type { UseFoodSearchResult } from '@/hooks/useFoodSearch';
import { colors, radii, spacing, typography } from '@/theme';
import type { OffProduct } from '@/utils/openFoodFacts';

// UI condivisa per la ricerca cibo: search bar + lista risultati locali e
// remoti (Open Food Facts) con stato di loading, errore e retry. È pilotata
// da `useFoodSearch` (passato come prop `search`), così i consumer possono
// scegliere se sospendere la query (es. quando un modal è chiuso) e gestire
// le selezioni nel proprio flusso (`onPickLocal` / `onPickRemote`).
//
// Riusano questo componente:
// - AddFoodSheet (tab "Cerca")
// - FavoriteEditorModal (popolare un preferito)
// - FoodSearchScreen (lookup informativo read-only)

type FoodSearchListProps = {
  search: UseFoodSearchResult;
  onPickLocal?: (food: Food) => void;
  onPickRemote?: (product: OffProduct) => void;
  // Quando settato mostra l'icona matita per editare le porzioni di un food
  // locale (usato solo in AddFoodSheet).
  onEditServings?: (food: Food) => void;
  searchPlaceholder?: string;
  // Quando true, il sottotitolo dei food locali aggiunge la fonte
  // ("manuale" / "Open Food Facts" / "barcode"). Default false: solo kcal.
  showSourceLabel?: boolean;
  // Default true. Quando false la lista non scrolla autonomamente: usalo
  // dentro a una ScrollView padre (è il caso del FavoriteEditorModal). In
  // questa modalità il container non occupa più tutto lo spazio (niente
  // flex:1), così l'altezza si adatta al contenuto.
  scrollEnabled?: boolean;
  // Lookup informativo (FoodSearchScreen): righe non cliccabili, niente
  // chevron-right. I sottotitoli mostrano kcal e — se disponibili — le macro
  // per 100 g, così la riga è sufficiente da sola senza dover navigare.
  readOnly?: boolean;
};

type SearchItem =
  | { kind: 'section'; title: string; key: string }
  | { kind: 'local'; food: Food; key: string }
  | { kind: 'remote'; product: OffProduct; key: string }
  | { kind: 'empty'; message: string; key: string }
  | { kind: 'error'; message: string; key: string }
  | { kind: 'loading'; key: string };

export function FoodSearchList({
  search,
  onPickLocal,
  onPickRemote,
  onEditServings,
  searchPlaceholder = 'Cerca alimento',
  showSourceLabel = false,
  scrollEnabled = true,
  readOnly = false,
}: FoodSearchListProps) {
  const {
    query,
    setQuery,
    localResults,
    remoteResults,
    loadingRemote,
    remoteError,
    retry,
  } = search;

  const items = useMemo<SearchItem[]>(() => {
    const out: SearchItem[] = [];
    out.push({ kind: 'section', title: 'Dal tuo database', key: 'sec-local' });
    if (localResults.length === 0) {
      out.push({ kind: 'empty', message: 'Nessun alimento locale', key: 'empty-local' });
    } else {
      for (const food of localResults) {
        out.push({ kind: 'local', food, key: `local-${food.id}` });
      }
    }

    out.push({ kind: 'section', title: 'Da Open Food Facts', key: 'sec-remote' });
    if (query.trim().length < 2) {
      out.push({
        kind: 'empty',
        message: 'Scrivi almeno 2 caratteri per cercare online',
        key: 'empty-remote-hint',
      });
    } else if (loadingRemote) {
      out.push({ kind: 'loading', key: 'loading-remote' });
    } else if (remoteError) {
      out.push({ kind: 'error', message: remoteError, key: 'error-remote' });
    } else {
      const localNames = new Set(localResults.map((f) => f.name.toLowerCase()));
      const filtered = remoteResults.filter(
        (p) => !localNames.has(p.name.toLowerCase()),
      );
      if (filtered.length === 0) {
        out.push({
          kind: 'empty',
          message: 'Nessun risultato online',
          key: 'empty-remote',
        });
      } else {
        for (const product of filtered) {
          out.push({
            kind: 'remote',
            product,
            key: `remote-${product.code ?? product.name}`,
          });
        }
      }
    }
    return out;
  }, [localResults, remoteResults, loadingRemote, remoteError, query]);

  return (
    <View style={scrollEnabled ? styles.container : styles.containerInline}>
      <View style={styles.searchField}>
        <Icon name="search" size={16} color={colors.textSec} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.textSec}
          style={styles.searchInput}
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={ListSeparator}
        scrollEnabled={scrollEnabled}
        renderItem={({ item }) => {
          if (item.kind === 'section') {
            return (
              <Text style={[typography.label, styles.sectionTitle]}>{item.title}</Text>
            );
          }
          if (item.kind === 'empty') {
            return (
              <Text style={[typography.caption, styles.emptyText]}>{item.message}</Text>
            );
          }
          if (item.kind === 'error') {
            return (
              <View style={styles.errorRow}>
                <Text style={[typography.caption, styles.errorText]} numberOfLines={2}>
                  {item.message}
                </Text>
                <Pressable
                  onPress={retry}
                  style={styles.retryBtn}
                  hitSlop={8}
                >
                  <Text style={[typography.label, styles.retryText]}>Riprova</Text>
                </Pressable>
              </View>
            );
          }
          if (item.kind === 'loading') {
            return (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.textSec} />
                <Text style={typography.caption}>Cercando su Open Food Facts…</Text>
              </View>
            );
          }
          if (item.kind === 'local') {
            const baseSubtitle = showSourceLabel
              ? `${item.food.caloriesPer100g} kcal / 100 g · ${sourceLabel(item.food.source)}`
              : `${item.food.caloriesPer100g} kcal / 100 g`;
            return (
              <ResultRow
                title={item.food.name}
                subtitle={baseSubtitle}
                macroLine={readOnly ? formatMacros(item.food) : undefined}
                onPress={readOnly ? undefined : () => onPickLocal?.(item.food)}
                onEditServings={
                  !readOnly && onEditServings ? () => onEditServings(item.food) : undefined
                }
                showChevron={!readOnly}
              />
            );
          }
          return (
            <ResultRow
              title={item.product.name}
              subtitle={`${item.product.caloriesPer100g} kcal / 100 g · ${
                item.product.brand ?? 'Open Food Facts'
              }`}
              macroLine={readOnly ? formatMacros(item.product) : undefined}
              badge="OFF"
              onPress={readOnly ? undefined : () => onPickRemote?.(item.product)}
              showChevron={!readOnly}
            />
          );
        }}
      />
    </View>
  );
}

function ListSeparator() {
  return <View style={{ height: spacing.xs }} />;
}

function ResultRow({
  title,
  subtitle,
  macroLine,
  badge,
  onPress,
  onEditServings,
  showChevron = true,
}: {
  title: string;
  subtitle: string;
  macroLine?: string;
  badge?: string;
  onPress?: () => void;
  onEditServings?: () => void;
  showChevron?: boolean;
}) {
  const body = (
    <>
      <View style={styles.resultText}>
        <Text style={typography.body} numberOfLines={1}>
          {title}
        </Text>
        <Text style={typography.caption} numberOfLines={1}>
          {subtitle}
        </Text>
        {macroLine ? (
          <Text style={[typography.micro, styles.macroLine]} numberOfLines={1}>
            {macroLine}
          </Text>
        ) : null}
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={[typography.micro, { color: colors.blue }]}>{badge}</Text>
        </View>
      ) : null}
      {onEditServings ? (
        <Pressable
          onPress={onEditServings}
          style={styles.servingsEditBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Modifica porzioni di ${title}`}
        >
          <Icon name="pencil" size={14} color={colors.textSec} />
        </Pressable>
      ) : null}
      {showChevron ? (
        <Icon name="chevron-right" size={14} color={colors.textSec} />
      ) : null}
    </>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={styles.resultRow}>
        {body}
      </Pressable>
    );
  }
  return <View style={styles.resultRow}>{body}</View>;
}

function formatMacros(item: { proteinPer100g: number | null; carbsPer100g: number | null; fatPer100g: number | null }): string | undefined {
  const p = item.proteinPer100g;
  const c = item.carbsPer100g;
  const f = item.fatPer100g;
  if (p == null && c == null && f == null) return undefined;
  const fmt = (n: number | null) => (n == null ? '—' : `${n}`);
  return `P ${fmt(p)} g · C ${fmt(c)} g · G ${fmt(f)} g`;
}

function sourceLabel(source: FoodSource): string {
  switch (source) {
    case 'manual':
      return 'manuale';
    case 'api':
      return 'Open Food Facts';
    case 'barcode':
      return 'barcode';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.xl,
  },
  containerInline: {
    gap: spacing.xl,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? spacing.lg : spacing.md,
    fontSize: 14,
    color: colors.text,
    fontFamily: typography.body.fontFamily,
  },
  listContent: {
    paddingBottom: spacing.screen,
    gap: spacing.xs,
  },
  sectionTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    paddingVertical: spacing.md,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.redLight,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  errorText: {
    flex: 1,
    color: colors.red,
  },
  retryBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.round,
    backgroundColor: colors.blueLight,
  },
  retryText: {
    color: colors.blue,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  resultText: {
    flex: 1,
    gap: spacing.xxs,
  },
  macroLine: {
    color: colors.textSec,
  },
  badge: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.blueLight,
  },
  servingsEditBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.round,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

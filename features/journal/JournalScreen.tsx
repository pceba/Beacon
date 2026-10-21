import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, ListRenderItem, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpenText } from 'lucide-react-native';
import { EmptyState } from '../../components/ui/EmptyState';
import { InlineError } from '../../components/ui/InlineError';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Segmented } from '../../components/ui/Segmented';
import { Colors } from '../../constants/colors';
import { Spacing, tabClearance } from '../../constants/spacing';
import { RootStackParamList } from '../../types/navigation';
import { JournalRowView, RowGap } from './components/JournalRows';
import { JournalRow, Segment, useJournalData } from './hooks/useJournalData';

const SEGMENTS: Array<{ value: Segment; label: string }> = [
  { value: 'reflections', label: 'Reflexiones' },
  { value: 'notes', label: 'Notas' },
  { value: 'feed', label: 'Todo' },
];

const keyExtractor = (row: JournalRow) => row.id;
const renderItem: ListRenderItem<JournalRow> = ({ item }) => <JournalRowView row={item} />;

export const JournalScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [segment, setSegment] = useState<Segment>('reflections');
  const [refreshing, setRefreshing] = useState(false);
  const { rows, hasEntries, hasNotes, loaded, failed, refetchAll } = useJournalData(segment);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
  }, [refetchAll]);

  const openComposer = useCallback(() => {
    if (segment === 'notes') navigation.navigate('AddNoteModal');
    else navigation.navigate('AddReflectionModal');
  }, [navigation, segment]);
  const openReflection = useCallback(() => navigation.navigate('AddReflectionModal'), [navigation]);

  const headerAction = useMemo(
    () =>
      segment === 'feed' || (segment === 'notes' ? !hasNotes : !hasEntries)
        ? undefined
        : { label: segment === 'notes' ? 'Nota' : 'Escribir', onPress: openComposer },
    [hasEntries, hasNotes, openComposer, segment],
  );

  const empty = useMemo(() => {
    if (!loaded) return null;
    if (segment === 'reflections') {
      return <EmptyState icon={BookOpenText} title="Sin reflexiones" body="Escribe lo que ha pasado hoy." action={{ label: 'Escribir', onPress: openComposer }} />;
    }
    if (segment === 'notes') {
      return <EmptyState icon={BookOpenText} title="Sin notas" body="Una frase basta." action={{ label: 'Nueva nota', onPress: openComposer }} />;
    }
    return (
      <EmptyState icon={BookOpenText} title="Nada escrito" body="Las reflexiones y las notas aparecen aquí." action={{ label: 'Escribir', onPress: openReflection }} />
    );
  }, [loaded, openComposer, openReflection, segment]);

  const error = useMemo(
    () =>
      failed ? (
        <View style={styles.error}>
          <InlineError title="No se ha podido cargar el diario" body="Tira hacia abajo o inténtalo otra vez." onRetry={() => void onRefresh()} />
        </View>
      ) : null,
    [failed, onRefresh],
  );

  const listStyle = useMemo(() => [styles.list, { paddingBottom: tabClearance(insets.bottom) }], [insets.bottom]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.md }]}>
      <ScreenHeader title="Diario" action={headerAction} />
      <Segmented value={segment} onChange={setSegment} options={SEGMENTS} />
      <FlatList
        data={rows}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={RowGap}
        ListHeaderComponent={error}
        ListEmptyComponent={empty}
        contentContainerStyle={listStyle}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={Colors.ink} />}
        initialNumToRender={8}
        windowSize={7}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, paddingHorizontal: Spacing.lg, gap: Spacing.md },
  list: { paddingTop: Spacing.sm },
  error: { marginBottom: Spacing.md },
});

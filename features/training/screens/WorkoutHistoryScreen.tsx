import React, { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, FlatList, ListRenderItem, StyleSheet, View } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Dumbbell } from 'lucide-react-native';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Colors } from '../../../constants/colors';
import { cardShadow, Radius, Spacing } from '../../../constants/spacing';
import { toast } from '../../../lib/toast';
import { HistoryItem } from '../../../services/workoutService';
import { LogStackParamList } from '../../../types/navigation';
import { HISTORY_ROW_HEIGHT, HistoryRow } from '../components/HistoryRow';
import { ScreenBar } from '../components/ScreenBar';
import { trainingQueries } from '../trainingQueries';

const keyOf = (item: HistoryItem) => item.id;
const layout = (_data: ArrayLike<HistoryItem> | null | undefined, index: number) => ({ length: HISTORY_ROW_HEIGHT, offset: HISTORY_ROW_HEIGHT * index, index });

// Historial de entrenos (DESIGN.md §7.5): 30 por página, el volumen se calcula por página.
export const WorkoutHistoryScreen = () => {
  const navigation = useNavigation<NavigationProp<LogStackParamList>>();
  const insets = useSafeAreaInsets();
  const query = useInfiniteQuery(trainingQueries.history());
  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);

  useEffect(() => {
    if (query.isError) toast.show({ message: 'No se ha podido cargar el historial.', kind: 'error' });
  }, [query.isError]);

  const onOpen = useCallback((workoutId: string) => navigation.navigate('WorkoutDetailScreen', { workoutId, mode: 'edit' }), [navigation]);
  const renderItem: ListRenderItem<HistoryItem> = useCallback(({ item }) => <HistoryRow item={item} onOpen={onOpen} />, [onOpen]);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const empty = query.isSuccess ? (
    <EmptyState
      icon={Dumbbell}
      color={Colors.workout}
      soft={Colors.workoutSoft}
      title="Aún no hay entrenos"
      body="Cuando termines uno, aparecerá aquí."
    />
  ) : query.isPending ? (
    <ActivityIndicator color={Colors.text3} style={styles.loading} />
  ) : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenBar title="Historial" leftLabel="Atrás" onLeft={navigation.goBack} />
      <View style={[styles.card, { marginBottom: insets.bottom + Spacing.md }]}>
        <FlatList
          data={items}
          keyExtractor={keyOf}
          renderItem={renderItem}
          getItemLayout={layout}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={empty}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={Colors.text3} style={styles.more} /> : null}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  card: { flex: 1, marginHorizontal: Spacing.lg, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: Colors.surface, ...cardShadow },
  loading: { marginVertical: Spacing.xxl },
  more: { marginVertical: Spacing.lg },
});

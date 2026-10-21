import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, LayoutChangeEvent, ListRenderItem, NativeScrollEvent, NativeSyntheticEvent, Platform, StyleSheet, View } from 'react-native';

type Props = {
  count: number;
  index: number;
  onIndexChange: (index: number) => void;
  renderPage: (index: number, width: number) => React.ReactElement;
};

const keyOf = (item: number) => String(item);

// Pager horizontal virtualizado (DESIGN.md §8.6): solo se pinta la página visible ± 1.
// `index` manda: si cambia desde fuera (Hoy, tocar un día), salta sin animación.
export const Pager = ({ count, index, onIndexChange, renderPage }: Props) => {
  const list = useRef<FlatList<number>>(null);
  const [width, setWidth] = useState(0);
  // Alto explícito por página: en web una celda horizontal crece con su contenido y la rejilla no haría scroll.
  const [height, setHeight] = useState(0);
  const shown = useRef(index);
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const data = useMemo(() => Array.from({ length: count }, (_, item) => item), [count]);

  useEffect(() => {
    if (!width || index === shown.current) return;
    shown.current = index;
    list.current?.scrollToOffset({ offset: index * width, animated: false });
  }, [index, width]);

  useEffect(() => () => clearTimeout(settle.current), []);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setHeight(Math.round(event.nativeEvent.layout.height));
      const next = Math.round(event.nativeEvent.layout.width);
      if (next === width) return;
      setWidth(next);
      requestAnimationFrame(() => list.current?.scrollToOffset({ offset: shown.current * next, animated: false }));
    },
    [width],
  );

  const report = useCallback(
    (offset: number) => {
      if (!width) return;
      const next = Math.max(0, Math.min(count - 1, Math.round(offset / width)));
      if (next === shown.current) return;
      shown.current = next;
      onIndexChange(next);
    },
    [count, onIndexChange, width],
  );

  const onMomentumEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => report(event.nativeEvent.contentOffset.x), [report]);

  // En web no hay eventos de inercia: se decide cuando el desplazamiento se detiene.
  const onWebScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = event.nativeEvent.contentOffset.x;
      clearTimeout(settle.current);
      settle.current = setTimeout(() => report(offset), 140);
    },
    [report],
  );

  const getItemLayout = useCallback((_: unknown, item: number) => ({ length: width, offset: width * item, index: item }), [width]);

  const renderItem: ListRenderItem<number> = useCallback(
    ({ item }) => <View style={[styles.page, { width, height }]}>{renderPage(item, width)}</View>,
    [height, renderPage, width],
  );

  return (
    <View style={styles.root} onLayout={onLayout}>
      {width > 0 && height > 0 ? (
        <FlatList
          ref={list}
          data={data}
          keyExtractor={keyOf}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          getItemLayout={getItemLayout}
          initialScrollIndex={index}
          initialNumToRender={1}
          maxToRenderPerBatch={1}
          windowSize={3}
          removeClippedSubviews={Platform.OS === 'android'}
          onMomentumScrollEnd={Platform.OS === 'web' ? undefined : onMomentumEnd}
          onScroll={Platform.OS === 'web' ? onWebScroll : undefined}
          scrollEventThrottle={Platform.OS === 'web' ? 32 : undefined}
          extraData={renderPage}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { flex: 1 },
});

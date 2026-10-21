import React, { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { Keyboard, LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { sheetStore } from './sheetStore';
import { SheetLayer } from './SheetLayer';

// Capa única para todas las hojas, montada una vez encima del navegador (DESIGN.md §9).
// Las hojas no usan Modal: abrir solo anima valores en el hilo de UI.

const useKeyboardLift = () => {
  const lift = useSharedValue(0);
  const keyboard = useRef(0);
  const fullHeight = useRef(0);
  const height = useRef(0);

  // Si el sistema ya encoge la ventana con el teclado, solo se sube lo que falte.
  const update = useCallback(() => {
    const resized = Math.max(0, fullHeight.current - height.current);
    lift.value = withTiming(Math.max(0, keyboard.current - resized), { duration: 160 });
  }, [lift]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboard.current = event.endCoordinates.height;
      update();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboard.current = 0;
      update();
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [update]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      height.current = event.nativeEvent.layout.height;
      if (keyboard.current === 0) fullHeight.current = height.current;
      update();
    },
    [update],
  );

  return { lift, onLayout };
};

const SheetHost = () => {
  const ids = useSyncExternalStore(sheetStore.subscribeList, sheetStore.ids);
  const { lift, onLayout } = useKeyboardLift();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && sheetStore.closeTop()) event.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <View style={styles.host} onLayout={onLayout}>
      {ids.map((id) => (
        <SheetLayer key={id} id={id} lift={lift} />
      ))}
    </View>
  );
};

export const SheetProvider = ({ children }: { children: React.ReactNode }) => (
  <>
    {children}
    <SheetHost />
  </>
);

const styles = StyleSheet.create({
  host: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', pointerEvents: 'box-none' },
});

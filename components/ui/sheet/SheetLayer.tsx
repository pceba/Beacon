import React, { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { BackHandler, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, SharedValue, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/colors';
import { Motion } from '../../../constants/motion';
import { Radius, Spacing } from '../../../constants/spacing';
import { useReduceMotion } from '../../../hooks/useReduceMotion';
import { sheetStore } from './sheetStore';

// Mientras no se ha medido, la hoja espera muy por debajo de la pantalla.
const PARKED = 4000;
const DISMISS_DISTANCE = 90;
const DISMISS_VELOCITY = 800;

const Content = memo(({ node }: { node: React.ReactNode }) => <>{node}</>);

type Props = { id: number; lift: SharedValue<number> };

export const SheetLayer = memo(({ id, lift }: Props) => {
  const entry = useSyncExternalStore(
    useCallback((listener) => sheetStore.subscribeEntry(id, listener), [id]),
    () => sheetStore.get(id),
  );
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const visible = entry?.visible ?? false;
  const keepMounted = entry?.keepMounted ?? false;
  const fullHeight = entry?.fullHeight ?? false;

  const height = useSharedValue(0);
  const translateY = useSharedValue(PARKED);
  const opacity = useSharedValue(1);
  const scrim = useSharedValue(0);
  const [lingering, setLingering] = useState(false);
  const pendingOpen = useRef(false);
  const wasVisible = useRef(false);

  const requestClose = useCallback(() => sheetStore.get(id)?.onClose(), [id]);
  const finishClose = useCallback(() => {
    const current = sheetStore.get(id);
    if (!current || current.visible) return;
    if (current.keepMounted) return;
    // El contenido se desmonta: la próxima vez hay que volver a medir antes de abrir.
    height.value = 0;
    translateY.value = PARKED;
    setLingering(false);
  }, [height, id, translateY]);

  const open = useCallback(() => {
    if (reduce) {
      translateY.value = withTiming(0, { ...Motion.reducedFade, duration: 0 });
      opacity.value = withSequence(
        Motion.reducedFade.reduceMotion,
        withTiming(0, { ...Motion.reducedFade, duration: 0 }),
        withTiming(1, Motion.reducedFade),
      );
      scrim.value = withTiming(1, Motion.reducedFade);
      return;
    }
    opacity.value = 1;
    translateY.value = withTiming(0, Motion.sheetOpen);
    scrim.value = withTiming(1, Motion.scrimIn);
  }, [opacity, reduce, scrim, translateY]);

  const close = useCallback(() => {
    const travel = height.value > 0 ? height.value : PARKED;
    if (reduce) {
      scrim.value = withTiming(0, Motion.reducedFade);
      opacity.value = withTiming(0, Motion.reducedFade, (done) => {
        if (!done) return;
        translateY.value = travel;
        runOnJS(finishClose)();
      });
      return;
    }
    scrim.value = withTiming(0, Motion.scrimOut);
    translateY.value = withTiming(travel, Motion.sheetClose, (done) => {
      if (done) runOnJS(finishClose)();
    });
  }, [finishClose, height, opacity, reduce, scrim, translateY]);

  // Se registra al abrir para quedar por delante del navegador y de las hojas de debajo.
  useEffect(() => {
    if (!visible) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      requestClose();
      return true;
    });
    return () => back.remove();
  }, [requestClose, visible]);

  useEffect(() => {
    if (visible) {
      wasVisible.current = true;
      setLingering(true);
      // Primera vez sin medir: se abre en cuanto llegue onLayout.
      if (height.value <= 0) pendingOpen.current = true;
      else open();
      return;
    }
    pendingOpen.current = false;
    if (wasVisible.current) {
      wasVisible.current = false;
      close();
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const measured = event.nativeEvent.layout.height;
      if (measured <= 0) return;
      const first = height.value <= 0;
      height.value = measured;
      if (pendingOpen.current || (first && sheetStore.get(id)?.visible)) {
        pendingOpen.current = false;
        translateY.value = measured;
        open();
        return;
      }
      if (first || !sheetStore.get(id)?.visible) translateY.value = measured;
    },
    [height, id, open, translateY],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(12)
        .failOffsetX([-24, 24])
        .onUpdate((event) => {
          translateY.value = Math.max(0, event.translationY);
        })
        .onEnd((event) => {
          if (event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY) {
            runOnJS(requestClose)();
            return;
          }
          translateY.value = withTiming(0, Motion.sheetOpen);
        }),
    [requestClose, translateY],
  );

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value - lift.value }],
  }));

  const mounted = visible || lingering || keepMounted;
  // Sin contenido no se pinta ni el marco: una medida vacía haría arrancar la hoja a medias.
  if (!entry || !mounted) return null;
  const hidden = !visible;
  const handle = (
    <View style={styles.handleWrap}>
      <View style={styles.handle} />
    </View>
  );
  const body = (
    <View style={[styles.body, fullHeight ? styles.bodyFull : null]}>
      <Content node={entry.node} />
    </View>
  );

  return (
    <View
      style={[StyleSheet.absoluteFill, { zIndex: sheetStore.depth(id), pointerEvents: hidden ? 'none' : 'box-none' }]}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      accessibilityViewIsModal={!hidden}
      aria-hidden={hidden}
    >
      <Animated.View style={[styles.scrim, scrimStyle]} />
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" style={StyleSheet.absoluteFill} onPress={requestClose} />
      {fullHeight ? (
        <Animated.View
          accessibilityLabel={entry.label}
          onLayout={onLayout}
          style={[styles.sheet, styles.full, { top: insets.top + 8, paddingBottom: Math.max(insets.bottom, 12) }, sheetStyle]}
        >
          {/* Solo el asa arrastra: la lista de dentro necesita el gesto vertical. */}
          <GestureDetector gesture={pan}>{handle}</GestureDetector>
          {body}
        </Animated.View>
      ) : (
        <GestureDetector gesture={pan}>
          <Animated.View
            accessibilityLabel={entry.label}
            onLayout={onLayout}
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }, sheetStyle]}
          >
            {handle}
            {body}
          </Animated.View>
        </GestureDetector>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.scrim },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
  },
  full: { flexDirection: 'column' },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle: { width: 36, height: 5, borderRadius: 3, backgroundColor: Colors.track },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  bodyFull: { flex: 1, paddingBottom: 0 },
});

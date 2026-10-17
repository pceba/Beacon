import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { useReduceMotion } from '../../hooks/useReduceMotion';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const SPRING = { damping: 22, stiffness: 220 };

const Handle = () => (
  <View style={styles.handleWrap}>
    <View style={styles.handle} />
  </View>
);

export const Sheet = ({ visible, onClose, children }: Props) => {
  const reduce = useReduceMotion();
  const insets = useSafeAreaInsets();
  const [rendered, setRendered] = useState(visible);
  const translateY = useSharedValue(800);
  const scrim = useSharedValue(0);
  const sheetOpacity = useSharedValue(1);
  const height = useSharedValue(480);
  const presented = useRef(false);
  const closing = useRef(false);
  const generation = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const finish = (token: number, notify: boolean) => {
    if (generation.current !== token) return;
    setRendered(false);
    if (notify) onCloseRef.current();
  };

  const beginClose = (notify: boolean) => {
    if (closing.current) return;
    closing.current = true;
    const token = generation.current;
    const done = () => finish(token, notify);
    const travel = height.value > 0 ? height.value : 480;
    if (reduce) {
      scrim.value = withTiming(0, { duration: 120 });
      sheetOpacity.value = withTiming(0, { duration: 120 }, (ended) => {
        if (ended) runOnJS(done)();
      });
      return;
    }
    scrim.value = withTiming(0, { duration: 200 });
    translateY.value = withSpring(travel, SPRING, (ended) => {
      if (ended) runOnJS(done)();
    });
  };

  useEffect(() => {
    if (visible) {
      generation.current += 1;
      closing.current = false;
      presented.current = false;
      translateY.value = 800;
      scrim.value = 0;
      sheetOpacity.value = reduce ? 0 : 1;
      setRendered(true);
      return;
    }
    if (rendered) beginClose(false);
  }, [visible]);

  const onLayout = (heightPx: number) => {
    if (heightPx <= 0) return;
    height.value = heightPx;
    if (presented.current || closing.current || !visible) return;
    presented.current = true;
    if (reduce) {
      translateY.value = 0;
      sheetOpacity.value = withTiming(1, { duration: 120 });
      scrim.value = withTiming(1, { duration: 120 });
      return;
    }
    translateY.value = heightPx;
    scrim.value = withTiming(1, { duration: 200 });
    translateY.value = withSpring(0, SPRING);
  };

  const requestClose = () => beginClose(true);

  const pan = Gesture.Pan()
    .activeOffsetY(12)
    .onUpdate((event) => {
      if (event.translationY > 0) translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationY > 90 || event.velocityY > 800) {
        runOnJS(requestClose)();
        return;
      }
      translateY.value = reduce ? withTiming(0, { duration: 120 }) : withSpring(0, SPRING);
    });

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal visible={rendered} transparent statusBarTranslucent animationType="none" onRequestClose={requestClose}>
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.stage} pointerEvents="box-none">
          <Animated.View pointerEvents="none" style={[styles.scrim, scrimStyle]} />
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" style={StyleSheet.absoluteFill} onPress={requestClose} />
          <View style={styles.dock} pointerEvents="box-none">
            <GestureDetector gesture={pan}>
              <Animated.View
                onLayout={(event) => onLayout(event.nativeEvent.layout.height)}
                style={[styles.sheet, sheetStyle, { paddingBottom: Math.max(insets.bottom, 12) }]}
              >
                <Handle />
                <View style={styles.body}>{children}</View>
              </Animated.View>
            </GestureDetector>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  stage: { flex: 1 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.scrim },
  dock: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
  },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle: { width: 36, height: 5, borderRadius: 3, backgroundColor: Colors.track },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
});

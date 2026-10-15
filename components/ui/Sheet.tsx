import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
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

class SheetErrorBoundary extends React.Component<{ onFail: () => void; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFail();
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

const FallbackSheet = ({ visible, onClose, children }: Props) => {
  const reduce = useReduceMotion();
  const translateY = useSharedValue(480);

  useEffect(() => {
    if (!visible) return;
    translateY.value = reduce ? withTiming(0, { duration: 120 }) : withSpring(0, SPRING);
  }, [reduce, translateY, visible]);

  const close = () => {
    const done = () => onClose();
    if (reduce) {
      translateY.value = withTiming(480, { duration: 120 }, (finished) => {
        if (finished) runOnJS(done)();
      });
      return;
    }
    translateY.value = withSpring(480, SPRING, (finished) => {
      if (finished) runOnJS(done)();
    });
  };

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationY > 90) {
        if (reduce) translateY.value = withTiming(480, { duration: 120 });
        else translateY.value = withSpring(480, SPRING);
        runOnJS(onClose)();
        return;
      }
      translateY.value = reduce ? withTiming(0, { duration: 120 }) : withSpring(0, SPRING);
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={styles.fallback}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" style={styles.scrim} onPress={close} />
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.fallbackSheet, sheetStyle]}>
            <Handle />
            <View style={styles.body}>{children}</View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

const GorhomSheet = ({ visible, onClose, children, onFail }: Props & { onFail: () => void }) => {
  const reduce = useReduceMotion();
  const ref = useRef<BottomSheetModal>(null);

  useEffect(() => {
    let alive = true;
    let frame = 0;
    let tries = 0;
    const attempt = () => {
      if (!alive) return;
      tries += 1;
      try {
        const sheet = ref.current;
        if (!sheet) {
          if (tries < 8) frame = requestAnimationFrame(attempt);
          else if (visible) onFail();
          return;
        }
        if (!visible) {
          sheet.dismiss();
          return;
        }
        const presented = sheet.present() as void | Promise<void>;
        if (presented && typeof presented.catch === 'function') {
          presented.catch(() => {
            if (alive) onFail();
          });
        }
      } catch {
        if (alive) onFail();
      }
    };
    frame = requestAnimationFrame(attempt);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
    };
  }, [onFail, visible]);

  const backdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.38} pressBehavior="close" />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      enablePanDownToClose
      animateOnMount={!reduce}
      animationConfigs={reduce ? { duration: 120 } : SPRING}
      onDismiss={onClose}
      backdropComponent={backdrop}
      handleComponent={Handle}
      backgroundStyle={styles.sheet}
    >
      <BottomSheetView style={styles.body}>{children}</BottomSheetView>
    </BottomSheetModal>
  );
};

export const Sheet = ({ visible, onClose, children }: Props) => {
  const [fallback, setFallback] = useState(false);
  const fail = useCallback(() => setFallback(true), []);

  if (fallback) return <FallbackSheet visible={visible} onClose={onClose}>{children}</FallbackSheet>;

  return (
    <SheetErrorBoundary onFail={fail}>
      <GorhomSheet visible={visible} onClose={onClose} onFail={fail}>
        {children}
      </GorhomSheet>
    </SheetErrorBoundary>
  );
};

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
  },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle: { width: 36, height: 5, borderRadius: 3, backgroundColor: Colors.track },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  fallback: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.scrim },
  fallbackSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingBottom: 12,
  },
});

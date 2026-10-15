import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { useReduceMotion } from '../../hooks/useReduceMotion';

type BlockProps = { width: number | `${number}%`; height: number; style?: ViewStyle };

export const SkeletonBlock = ({ width, height, style }: BlockProps) => {
  const reduce = useReduceMotion();
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    if (reduce) return;
    opacity.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
  }, [opacity, reduce]);

  const animated = useAnimatedStyle(() => ({ opacity: reduce ? 0.7 : opacity.value }));

  return <Animated.View style={[styles.block, { width, height }, animated, style]} />;
};

export const DelayedSkeleton = ({ loading, children, fallback }: { loading: boolean; children: React.ReactNode; fallback: React.ReactNode }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShow(false);
      return;
    }
    const timer = setTimeout(() => setShow(true), 300);
    return () => clearTimeout(timer);
  }, [loading]);

  if (!loading) return <>{children}</>;
  if (!show) return <View style={styles.hold} />;
  return <>{fallback}</>;
};

const styles = StyleSheet.create({
  block: { backgroundColor: Colors.track, borderRadius: 10 },
  hold: { minHeight: 24 },
});

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Motion } from '../../constants/motion';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { light } from '../../lib/haptics';

type Props = {
  done: boolean;
  color: string;
  label: string;
  onPress: () => void;
};

export const CheckCircle = ({ done, color, label, onPress }: Props) => {
  const reduce = useReduceMotion();
  const fill = useSharedValue(done ? 1 : 0);

  useEffect(() => {
    fill.value = reduce ? (done ? 1 : 0) : withTiming(done ? 1 : 0, { duration: Motion.enter, easing: Motion.easeOut });
  }, [done, fill, reduce]);

  const animated = useAnimatedStyle(() => ({
    opacity: fill.value,
    transform: [{ scale: 0.8 + fill.value * 0.2 }],
  }));

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: done }}
      hitSlop={8}
      onPress={() => {
        light();
        onPress();
      }}
      style={[styles.ring, { borderColor: done ? color : Colors.border }]}
    >
      <Animated.View style={[styles.fill, { backgroundColor: color }, animated]}>
        <Check color={Colors.surface} size={16} strokeWidth={2.6} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  ring: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: { ...StyleSheet.absoluteFillObject, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});

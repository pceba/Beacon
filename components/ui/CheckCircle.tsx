import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../constants/colors';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { light } from '../../lib/haptics';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const CHECK = 24;
const SPRING = { damping: 18, stiffness: 300 };

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
    if (reduce) {
      fill.value = done ? 1 : 0;
      return;
    }
    fill.value = withSpring(done ? 1 : 0, SPRING);
  }, [done, fill, reduce]);

  const fillStyle = useAnimatedStyle(() => ({
    opacity: fill.value,
    transform: [{ scale: 0.86 + fill.value * 0.14 }],
  }));
  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK * (1 - fill.value),
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
      <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]}>
        <Svg width={16} height={16} viewBox="0 0 24 24">
          <AnimatedPath
            d="M20 6 9 17l-5-5"
            stroke={Colors.surface}
            strokeWidth={2.6}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={CHECK}
            animatedProps={checkProps}
          />
        </Svg>
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

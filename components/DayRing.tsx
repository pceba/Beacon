import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { Colors } from '../constants/colors';
import { Motion } from '../constants/motion';
import { Typography } from '../constants/typography';
import { useReduceMotion } from '../hooks/useReduceMotion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  progress: number;
  label: string;
  caption: string;
  size?: number;
};

export const DayRing = ({ progress, label, caption, size = 118 }: Props) => {
  const reduce = useReduceMotion();
  const stroke = 9;
  const radius = (size - stroke) / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const animated = useSharedValue(0);

  useEffect(() => {
    const next = Math.max(0, Math.min(1, progress));
    animated.value = reduce ? next : withTiming(next, { duration: Motion.progress, easing: Motion.easeOut });
  }, [animated, progress, reduce]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animated.value),
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(247, 242, 234, 0.16)"
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.goldLight}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontFamily: Typography.fontDisplay,
    fontSize: 28,
    lineHeight: 32,
    color: Colors.textOnDark,
  },
  caption: {
    fontFamily: Typography.fontBold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: Colors.goldLight,
  },
});

import React, { useEffect } from 'react';
import { StyleProp, StyleSheet, TextInput, TextStyle } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { useReduceMotion } from '../../hooks/useReduceMotion';

const AnimatedInput = Animated.createAnimatedComponent(TextInput);

const group = (value: number) => {
  'worklet';
  const negative = value < 0;
  const raw = String(Math.round(Math.abs(value)));
  let grouped = '';
  for (let index = 0; index < raw.length; index += 1) {
    if (index > 0 && (raw.length - index) % 3 === 0) grouped += '.';
    grouped += raw[index];
  }
  return negative ? `-${grouped}` : grouped;
};

const waterText = (ml: number) => {
  'worklet';
  const amount = Math.max(0, ml);
  if (amount < 1000) return `${group(amount)} ml`;
  const liters = Math.round((amount / 1000) * 100) / 100;
  const whole = Math.floor(liters);
  const fraction = Math.round((liters - whole) * 100);
  if (fraction === 0) return `${group(whole)} L`;
  const digits = fraction % 10 === 0 ? String(fraction / 10) : String(fraction).padStart(2, '0');
  return `${group(whole)},${digits} L`;
};

const kcalText = (value: number) => {
  'worklet';
  return group(value);
};

type Props = {
  value: number;
  kind: 'water' | 'kcal';
  style?: StyleProp<TextStyle>;
};

export const AnimatedNumber = ({ value, kind, style }: Props) => {
  const reduce = useReduceMotion();
  const progress = useSharedValue(value);

  useEffect(() => {
    if (reduce) {
      progress.value = value;
      return;
    }
    progress.value = withTiming(value, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [progress, reduce, value]);

  const animatedProps = useAnimatedProps(() => {
    const shown = progress.value;
    const text = kind === 'water' ? waterText(shown) : kcalText(shown);
    return { text, defaultValue: text };
  });

  const initial = kind === 'water' ? waterText(value) : kcalText(value);
  const width = Math.ceil(initial.length * 17) + 2;

  return (
    <AnimatedInput
      editable={false}
      underlineColorAndroid="transparent"
      numberOfLines={1}
      animatedProps={animatedProps}
      defaultValue={initial}
      style={[style, styles.field, { width }]}
      maxFontSizeMultiplier={1.3}
    />
  );
};

const styles = StyleSheet.create({
  field: {
    height: 32,
    padding: 0,
    margin: 0,
    alignSelf: 'flex-start',
    flexGrow: 0,
    flexShrink: 0,
  },
});

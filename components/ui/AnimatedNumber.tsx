import React, { useCallback, useEffect, useState } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { Easing, runOnJS, useAnimatedReaction, useSharedValue, withTiming } from 'react-native-reanimated';
import { useReduceMotion } from '../../hooks/useReduceMotion';

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

const labelFor = (value: number, kind: 'water' | 'kcal') => {
  'worklet';
  return kind === 'water' ? waterText(value) : kcalText(value);
};

type Props = {
  value: number;
  kind: 'water' | 'kcal';
  style?: StyleProp<TextStyle>;
};

export const AnimatedNumber = ({ value, kind, style }: Props) => {
  const reduce = useReduceMotion();
  const progress = useSharedValue(value);
  const [label, setLabel] = useState(() => labelFor(value, kind));
  const publish = useCallback((next: string) => setLabel(next), []);

  useEffect(() => {
    if (reduce) {
      progress.value = value;
      setLabel(labelFor(value, kind));
      return;
    }
    progress.value = withTiming(value, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [kind, progress, reduce, value]);

  useAnimatedReaction(
    () => labelFor(progress.value, kind),
    (next, previous) => {
      if (next !== previous) runOnJS(publish)(next);
    },
  );

  return (
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={style} maxFontSizeMultiplier={1.3}>
      {label}
    </Text>
  );
};

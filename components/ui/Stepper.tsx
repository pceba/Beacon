import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { selection } from '../../lib/haptics';
import { Type, tabular } from '../../constants/typography';

type Props = {
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementLabel: string;
  incrementLabel: string;
};

export const Stepper = ({ value, onDecrement, onIncrement, decrementLabel, incrementLabel }: Props) => {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const delay = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    if (delay.current) clearTimeout(delay.current);
    if (timer.current) clearInterval(timer.current);
    delay.current = null;
    timer.current = null;
  };

  const hold = (step: () => void) => {
    step();
    selection();
    delay.current = setTimeout(() => {
      timer.current = setInterval(() => {
        step();
        selection();
      }, 120);
    }, 400);
  };

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={decrementLabel}
        onPressIn={() => hold(onDecrement)}
        onPressOut={stop}
        style={styles.step}
      >
        <Minus color={Colors.ink} size={18} />
      </Pressable>
      <Text maxFontSizeMultiplier={1.3} style={styles.value}>
        {value}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={incrementLabel}
        onPressIn={() => hold(onIncrement)}
        onPressOut={stop}
        style={styles.step}
      >
        <Plus color={Colors.ink} size={18} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  step: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg,
  },
  value: { ...Type.section, ...tabular, color: Colors.ink, minWidth: 64, textAlign: 'center' },
});

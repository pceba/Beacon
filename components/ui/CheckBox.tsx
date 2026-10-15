import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Motion } from '../../constants/motion';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { medium } from '../../lib/haptics';

type Props = {
  done: boolean;
  label: string;
  onPress: () => void;
};

export const CheckBox = ({ done, label, onPress }: Props) => {
  const reduce = useReduceMotion();
  const fill = useSharedValue(done ? 1 : 0);

  useEffect(() => {
    fill.value = reduce ? (done ? 1 : 0) : withTiming(done ? 1 : 0, { duration: Motion.enter, easing: Motion.easeOut });
  }, [done, fill, reduce]);

  const animated = useAnimatedStyle(() => ({ opacity: fill.value }));

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: done }}
      hitSlop={11}
      onPress={() => {
        medium();
        onPress();
      }}
      style={[styles.box, done ? styles.boxOn : null]}
    >
      <Animated.View style={animated}>
        <Check color={Colors.surface} size={14} strokeWidth={2.8} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  box: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: Colors.text4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: Colors.ink, borderColor: Colors.ink },
});

import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../constants/colors';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { medium } from '../../lib/haptics';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const CHECK = 24;
const SPRING = { damping: 18, stiffness: 300 };

type Props = {
  done: boolean;
  label: string;
  onPress: () => void;
};

export const CheckBox = ({ done, label, onPress }: Props) => {
  const reduce = useReduceMotion();
  const fill = useSharedValue(done ? 1 : 0);

  useEffect(() => {
    if (reduce) {
      fill.value = done ? 1 : 0;
      return;
    }
    fill.value = withSpring(done ? 1 : 0, SPRING);
  }, [done, fill, reduce]);

  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.value }));
  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK * (1 - fill.value),
  }));

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
      <Animated.View style={fillStyle}>
        <Svg width={14} height={14} viewBox="0 0 24 24">
          <AnimatedPath
            d="M20 6 9 17l-5-5"
            stroke={Colors.surface}
            strokeWidth={2.8}
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

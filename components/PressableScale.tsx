import React, { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Colors } from '../constants/colors';
import { useReduceMotion } from '../hooks/useReduceMotion';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  layoutStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  hitSlop?: number;
};

export const PressableScale = ({ children, onPress, onLongPress, disabled, style, layoutStyle, accessibilityLabel, hitSlop }: Props) => {
  const reduce = useReduceMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  const press = { damping: 18, stiffness: 300 };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        if (disabled) return;
        if (reduce) {
          opacity.value = withTiming(0.72, { duration: 120 });
          return;
        }
        scale.value = withSpring(0.97, press);
      }}
      onPressOut={() => {
        if (reduce) {
          opacity.value = withTiming(1, { duration: 120 });
          return;
        }
        scale.value = withSpring(1, press);
      }}
      style={(state) => {
        const focused = 'focused' in state && Boolean((state as { focused?: boolean }).focused);
        return [layoutStyle, focused ? styles.focus : null];
      }}
    >
      <Animated.View style={[style, layoutStyle ? styles.stretch : null, animated]}>{children}</Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  stretch: { width: '100%' },
  focus: {
    outlineWidth: 2,
    outlineStyle: 'solid',
    outlineOffset: 3,
    outlineColor: Colors.accent,
  },
});

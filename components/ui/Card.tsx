import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { cardShadow, Radius } from '../../constants/spacing';

type Props = {
  children: React.ReactNode;
  inset?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

export const Card = ({ children, inset, style, onPress }: Props) => {
  const box = [styles.card, inset ? styles.inset : null, style];
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={box}>
        {children}
      </Pressable>
    );
  }
  return <View style={box}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    ...cardShadow,
  },
  inset: { paddingVertical: 0, paddingHorizontal: 16 },
});

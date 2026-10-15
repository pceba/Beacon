import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { cardShadow, Radius } from '../../constants/spacing';

type Props = {
  children: React.ReactNode;
  inset?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const Card = ({ children, inset, style }: Props) => (
  <View style={[styles.card, inset ? styles.inset : null, style]}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    ...cardShadow,
  },
  inset: { paddingVertical: 0, paddingHorizontal: 16 },
});

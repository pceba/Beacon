import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Colors } from '../constants/colors';
import { Radius } from '../constants/spacing';
import { PressableScale } from './PressableScale';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: 'paper' | 'ink';
}

export const Card = ({ children, style, onPress, tone = 'paper' }: Props) => {
  const base = [styles.base, tone === 'ink' ? styles.ink : null, style];
  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={base}>
        {children}
      </PressableScale>
    );
  }
  return <View style={base}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  ink: {
    backgroundColor: Colors.ink,
    borderColor: 'transparent',
  },
});

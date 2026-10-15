import React from 'react';
import { ActivityIndicator, StyleSheet, Text, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/spacing';
import { Type } from '../../constants/typography';
import { PressableScale } from '../PressableScale';

type Variant = 'primary' | 'secondary' | 'outline' | 'danger' | 'dangerFill' | 'ghost';
type Size = 'lg' | 'md';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export const Button = ({ title, onPress, variant = 'primary', size = 'lg', loading, disabled, style }: Props) => {
  const spinner = variant === 'primary' || variant === 'dangerFill' ? Colors.surface : Colors.accent;

  return (
    <PressableScale
      accessibilityLabel={title}
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.base, styles[size], styles[variant], disabled ? styles.disabled : null, style]}
    >
      {loading ? (
        <ActivityIndicator color={disabled ? Colors.text4 : spinner} />
      ) : (
        <Text style={[styles.label, styles[`${variant}Text`], disabled ? styles.disabledText : null]}>{title}</Text>
      )}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  lg: { minHeight: 56, borderRadius: 16 },
  md: { minHeight: 52, borderRadius: 16 },
  primary: { backgroundColor: Colors.ink },
  secondary: { backgroundColor: Colors.accentSoft },
  outline: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  danger: { backgroundColor: 'transparent' },
  dangerFill: { backgroundColor: Colors.dangerSoft },
  ghost: { backgroundColor: 'transparent' },
  label: { ...Type.bodyStrong },
  primaryText: { color: Colors.surface },
  secondaryText: { color: Colors.accent },
  outlineText: { color: Colors.ink },
  dangerText: { color: Colors.danger },
  dangerFillText: { color: Colors.danger },
  ghostText: { color: Colors.text2 },
  disabled: { backgroundColor: Colors.track },
  disabledText: { color: Colors.text4 },
});

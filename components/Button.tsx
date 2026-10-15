import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { Colors } from '../constants/colors';
import { Radius } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { PressableScale } from './PressableScale';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
  fill?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

export const Button = ({ title, onPress, variant = 'primary', style, fill, loading, disabled }: Props) => {
  const onDark = variant === 'primary' || variant === 'danger';

  return (
    <PressableScale
      accessibilityLabel={title}
      disabled={disabled || loading}
      onPress={onPress}
      layoutStyle={fill ? styles.fill : undefined}
      style={[styles.base, styles[variant], style, disabled || loading ? styles.disabled : null]}
    >
      {loading ? (
        <ActivityIndicator color={onDark ? Colors.surface : Colors.ink} />
      ) : (
        <Text style={[styles.text, onDark ? styles.textOnDark : styles.textOnLight]}>{title}</Text>
      )}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  base: {
    minHeight: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  primary: { backgroundColor: Colors.ink },
  secondary: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  danger: { backgroundColor: Colors.danger },
  ghost: { backgroundColor: 'transparent' },
  text: { fontFamily: Typography.fontBold, fontSize: Typography.md },
  textOnDark: { color: Colors.surface },
  textOnLight: { color: Colors.ink },
  disabled: { opacity: 0.55 },
});

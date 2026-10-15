import React, { useMemo, useState } from 'react';
import { KeyboardTypeOptions, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors } from '../constants/colors';
import { Radius, Spacing } from '../constants/spacing';
import { Typography } from '../constants/typography';

interface Props {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
}

export const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  numberOfLines,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
  error,
}: Props) => {
  const [focused, setFocused] = useState(false);
  const borderColor = useMemo(() => (error ? Colors.danger : focused ? Colors.accent : Colors.border), [error, focused]);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, { borderColor }, multiline ? styles.multiline : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.text3}
        multiline={multiline}
        numberOfLines={numberOfLines}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCapitalize === 'none' ? false : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        selectionColor={Colors.accent}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.xs },
  label: {
    color: Colors.text2,
    fontSize: Typography.sm,
    fontFamily: Typography.fontMedium,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderRadius: Radius.md,
    color: Colors.ink,
    fontFamily: Typography.fontRegular,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  error: { color: Colors.danger, fontFamily: Typography.fontRegular, fontSize: Typography.xs },
});

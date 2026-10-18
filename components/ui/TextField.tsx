import React, { useMemo, useState } from 'react';
import { KeyboardTypeOptions, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Type } from '../../constants/typography';

type Props = {
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
  onBlur?: () => void;
};

export const TextField = ({
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
  onBlur,
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
        placeholderTextColor={Colors.text4}
        multiline={multiline}
        numberOfLines={numberOfLines}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCapitalize === 'none' ? false : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        selectionColor={Colors.accent}
        accessibilityLabel={label}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.xs },
  label: { ...Type.caption, color: Colors.text2 },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderRadius: Radius.md,
    color: Colors.ink,
    ...Type.body,
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  error: { ...Type.caption, color: Colors.danger },
});

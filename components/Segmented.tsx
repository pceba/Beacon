import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';
import { Radius } from '../constants/spacing';
import { Typography } from '../constants/typography';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  value: T;
  options: Array<Option<T>>;
  onChange: (value: T) => void;
};

export const Segmented = <T extends string>({ value, options, onChange }: Props<T>) => (
  <View style={styles.track}>
    {options.map((option) => {
      const selected = option.value === value;
      return (
        <Pressable
          key={option.value}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          onPress={() => onChange(option.value)}
          style={({ pressed }) => [styles.item, selected ? styles.selected : null, pressed ? styles.pressed : null]}
        >
          <Text style={[styles.label, selected ? styles.labelOn : null]}>{option.label}</Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: Colors.fill,
    borderRadius: Radius.full,
    padding: 4,
    gap: 4,
  },
  item: {
    flex: 1,
    minHeight: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  selected: { backgroundColor: Colors.surface },
  pressed: { opacity: 0.72 },
  label: { fontFamily: Typography.fontMedium, fontSize: Typography.sm, color: Colors.text2 },
  labelOn: { color: Colors.ink, fontFamily: Typography.fontBold },
});

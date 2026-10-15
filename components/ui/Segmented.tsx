import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { cardShadow, Radius } from '../../constants/spacing';
import { Type } from '../../constants/typography';
import { selection } from '../../lib/haptics';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  value: T;
  options: Array<Option<T>>;
  onChange: (value: T) => void;
};

export const Segmented = <T extends string>({ value, options, onChange }: Props<T>) => (
  <View accessibilityRole="tablist" style={styles.track}>
    {options.map((option) => {
      const selected = option.value === value;
      return (
        <Pressable
          key={option.value}
          accessibilityRole="tab"
          accessibilityLabel={option.label}
          accessibilityState={{ selected }}
          onPress={() => {
            if (option.value === value) return;
            selection();
            onChange(option.value);
          }}
          style={[styles.item, selected ? styles.itemOn : null]}
          hitSlop={4}
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
    backgroundColor: Colors.track,
    borderRadius: Radius.md,
    padding: 4,
    gap: 4,
  },
  item: { flex: 1, minHeight: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  itemOn: { backgroundColor: Colors.surface, ...cardShadow },
  label: { ...Type.caption, color: Colors.text2, textAlign: 'center' },
  labelOn: { ...Type.bodyStrong, color: Colors.ink, fontSize: 13, lineHeight: 18 },
});

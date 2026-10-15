import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/spacing';
import { Type } from '../../constants/typography';
import { selection } from '../../lib/haptics';

type Props = {
  label: string;
  selected?: boolean;
  color?: string;
  soft?: string;
  onPress?: () => void;
};

export const Chip = ({ label, selected, color = Colors.ink, soft = Colors.fill, onPress }: Props) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ selected: !!selected }}
    disabled={!onPress}
    hitSlop={4}
    onPress={() => {
      selection();
      onPress?.();
    }}
    style={[styles.chip, selected ? { backgroundColor: Colors.ink } : { backgroundColor: soft }]}
  >
    <Text style={[styles.label, { color: selected ? Colors.surface : color }]}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...Type.caption },
});

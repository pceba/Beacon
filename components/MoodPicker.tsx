import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';
import { Radius, Spacing } from '../constants/spacing';

const moods = ['😞', '😕', '😐', '🙂', '😊'];

interface Props {
  value: number;
  onChange: (value: number) => void;
}

export const MoodPicker = ({ value, onChange }: Props) => (
  <View style={styles.row}>
    {moods.map((emoji, index) => {
      const score = index + 1;
      const selected = value === score;
      return (
        <Pressable key={emoji} style={[styles.item, selected ? styles.selected : null]} onPress={() => onChange(score)}>
          <Text style={styles.emoji}>{emoji}</Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'space-between' },
  item: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { borderColor: Colors.gold, backgroundColor: Colors.goldLight, transform: [{ scale: 1.05 }] },
  emoji: { fontSize: 22 },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { Radius, Spacing } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { habitIcon } from './habitVisuals';
import { PressableScale } from './PressableScale';

type Props = {
  name: string;
  icon: string | null;
  color: string;
  done: boolean;
  meta?: string;
  streak?: number;
  marks: Array<{ on: boolean; letter: string }>;
  onPress: () => void;
  onLongPress?: () => void;
};

export const HabitRow = ({ name, icon, color, done, meta, streak = 0, marks, onPress, onLongPress }: Props) => {
  const Icon = habitIcon(icon);
  const streakLabel = streak >= 2 ? `racha ${streak}` : null;

  return (
    <PressableScale
      accessibilityLabel={[name, streakLabel, done ? 'hecho' : 'pendiente'].filter(Boolean).join(', ')}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.row}
    >
      <View style={[styles.mark, done ? { backgroundColor: color, borderColor: color } : { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
        {done ? <Check color={Colors.white} size={16} strokeWidth={2.6} /> : <Icon color={color} size={16} />}
      </View>
      <View style={styles.copy}>
        <View style={styles.nameLine}>
          <Text numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          {streak >= 2 ? <Text style={styles.streak}>🔥 {streak}</Text> : null}
        </View>
        {meta ? (
          <Text numberOfLines={1} style={styles.meta}>
            {meta}
          </Text>
        ) : null}
      </View>
      <View style={styles.week}>
        {marks.map((mark, index) => (
          <View key={index} style={styles.day}>
            <Text style={[styles.letter, index === marks.length - 1 ? styles.letterToday : null]}>{mark.letter}</Text>
            <View style={[styles.dot, mark.on ? { backgroundColor: color } : styles.dotEmpty]} />
          </View>
        ))}
      </View>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  mark: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  name: { flexShrink: 1, fontFamily: Typography.fontBold, fontSize: Typography.md, color: Colors.textPrimary },
  streak: { flexShrink: 0, fontFamily: Typography.fontMedium, fontSize: Typography.sm, color: Colors.textMuted },
  meta: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, color: Colors.textMuted },
  week: { flexDirection: 'row', gap: 3, flexShrink: 0 },
  day: { width: 14, alignItems: 'center', gap: 4 },
  letter: { fontFamily: Typography.fontMedium, fontSize: 10, color: Colors.textMuted },
  letterToday: { color: Colors.textPrimary },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotEmpty: { backgroundColor: Colors.border },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MoonStar, Dumbbell, UtensilsCrossed, Sparkles, BookMarked, CheckSquare } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { Radius, Spacing } from '../constants/spacing';
import { Typography } from '../constants/typography';

type CategoryType = 'sleep' | 'workout' | 'nutrition' | 'habit' | 'journal' | 'task';

const config: Record<CategoryType, { color: string; label: string; Icon: typeof MoonStar }> = {
  sleep: { color: Colors.sleep, label: 'Sleep', Icon: MoonStar },
  workout: { color: Colors.workout, label: 'Workout', Icon: Dumbbell },
  nutrition: { color: Colors.nutrition, label: 'Nutrition', Icon: UtensilsCrossed },
  habit: { color: Colors.habit, label: 'Habit', Icon: Sparkles },
  journal: { color: Colors.journal, label: 'Journal', Icon: BookMarked },
  task: { color: Colors.task, label: 'Task', Icon: CheckSquare },
};

export const CategoryBadge = ({ type }: { type: CategoryType }) => {
  const item = config[type];
  const Icon = item.Icon;
  return (
    <View style={[styles.badge, { borderColor: item.color }]}>
      <Icon size={12} color={item.color} />
      <Text style={[styles.label, { color: item.color }]}>{item.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  label: { fontFamily: Typography.fontRegular, fontSize: Typography.xs },
});

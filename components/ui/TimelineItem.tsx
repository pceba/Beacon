import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BookOpen, CheckSquare, Dumbbell, Moon, PenLine, Sparkles, Utensils } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Type } from '../../constants/typography';
import { TimelineEntry } from '../../types/database';
import { entryLabel } from '../../utils/labels';

type Props = {
  entry: TimelineEntry;
  onEdit?: () => void;
  onDelete?: () => void;
};

const typeIcon = {
  sleep: Moon,
  workout: Dumbbell,
  nutrition: Utensils,
  habit: Sparkles,
  journal: BookOpen,
  task: CheckSquare,
  note: PenLine,
} as const;

const typeColor: Record<TimelineEntry['type'], string> = {
  sleep: Colors.sleep,
  workout: Colors.workout,
  nutrition: Colors.food,
  habit: Colors.accent,
  journal: Colors.mood,
  task: Colors.ink,
  note: Colors.text2,
};

export const TimelineItem = ({ entry, onEdit, onDelete }: Props) => {
  const Icon = typeIcon[entry.type];
  const tint = typeColor[entry.type];

  return (
    <View style={styles.card}>
      <View style={[styles.icon, { backgroundColor: Colors.fill }]}>
        <Icon size={16} color={tint} />
      </View>
      <View style={styles.body}>
        <View style={styles.top}>
          <Text numberOfLines={1} style={styles.title}>
            {entry.title}
          </Text>
          <Text style={styles.time}>{entry.timestamp ?? ''}</Text>
        </View>
        <Text numberOfLines={2} style={styles.subtitle}>
          {entry.subtitle || entryLabel(entry.type)}
        </Text>
        {onEdit || onDelete ? (
          <View style={styles.actions}>
            {onEdit ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${entry.title}`} hitSlop={8} onPress={onEdit}>
                <Text style={styles.action}>Editar</Text>
              </Pressable>
            ) : null}
            {onDelete ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Eliminar ${entry.title}`} hitSlop={8} onPress={onDelete}>
                <Text style={[styles.action, styles.danger]}>Eliminar</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
  },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0, gap: 2 },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  time: { ...Type.caption, color: Colors.text3 },
  title: { flex: 1, minWidth: 0, ...Type.bodyStrong, color: Colors.ink },
  subtitle: { ...Type.caption, color: Colors.text3 },
  actions: { marginTop: Spacing.xs, flexDirection: 'row', gap: Spacing.lg },
  action: { ...Type.bodyStrong, fontSize: 14, color: Colors.accent },
  danger: { color: Colors.danger },
});

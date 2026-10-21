import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Card } from '../../../components/ui/Card';
import { CheckCircle } from '../../../components/ui/CheckCircle';
import { SwipeRow } from '../../../components/ui/SwipeRow';
import { Colors } from '../../../constants/colors';
import { Type } from '../../../constants/typography';
import { Habit } from '../../../types/database';
import { formatNumber } from '../../../utils/format';
import { Entrance } from '../hooks/useEntrance';
import { HabitItem } from '../hooks/useTodayData';
import { sectionStyles } from './sectionStyles';

type Props = {
  items: HabitItem[];
  doneCount: number;
  motion: Entrance;
  onAdd: () => void;
  onToggle: (habit: Habit) => void;
  onDelete: (habit: Habit) => void;
};

export const HabitsSection = memo(({ items, doneCount, motion, onAdd, onToggle, onDelete }: Props) => {
  const entering = useMemo(() => motion.enter(5), [motion]);
  return (
    <>
      <Animated.View entering={motion.enter(4)} style={sectionStyles.head}>
        <Text style={sectionStyles.title}>
          Hábitos{' '}
          <Text style={sectionStyles.meta}>
            {formatNumber(doneCount)} de {formatNumber(items.length)}
          </Text>
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Añadir hábito" hitSlop={8} onPress={onAdd} style={sectionStyles.linkHit}>
          <Text style={sectionStyles.link}>Añadir</Text>
        </Pressable>
      </Animated.View>
      <Card inset>
        {items.length === 0 ? <Text style={sectionStyles.empty}>Aún no hay hábitos. Añade el primero.</Text> : null}
        {items.map((item, index) => (
          <HabitRow
            key={item.habit.id}
            habit={item.habit}
            done={item.done}
            streak={item.streak}
            marks={item.marks}
            last={index === items.length - 1}
            entering={entering}
            exiting={motion.exit}
            layout={motion.layout}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </Card>
    </>
  );
});

type RowProps = Omit<HabitItem, 'habit'> & {
  habit: Habit;
  last: boolean;
  entering: ReturnType<Entrance['enter']>;
  exiting: Entrance['exit'];
  layout: Entrance['layout'];
  onToggle: (habit: Habit) => void;
  onDelete: (habit: Habit) => void;
};

const HabitRow = memo(({ habit, done, streak, marks, last, entering, exiting, layout, onToggle, onDelete }: RowProps) => {
  const toggle = useCallback(() => onToggle(habit), [habit, onToggle]);
  const remove = useCallback(() => void onDelete(habit), [habit, onDelete]);
  const color = habit.color || Colors.accent;
  return (
    <Animated.View entering={entering} exiting={exiting} layout={layout}>
      <SwipeRow label={`Eliminar ${habit.name}`} onDelete={remove}>
        <View style={[styles.habit, last ? styles.habitLast : null]}>
          <CheckCircle done={done} color={color} label={habit.name} onPress={toggle} />
          <View style={styles.habitCopy}>
            <Text numberOfLines={1} style={styles.habitName}>
              {habit.name}
            </Text>
            <Text style={styles.habitMeta}>{streak >= 2 ? `Racha de ${formatNumber(streak)} días` : done ? 'Hecho hoy' : 'Hoy pendiente'}</Text>
          </View>
          <View style={styles.week}>
            {marks.split('').map((on, index) => (
              <View key={index} style={[styles.dot, on === '1' ? { backgroundColor: color } : styles.dotOff, index === 6 ? styles.dotToday : null]} />
            ))}
          </View>
        </View>
      </SwipeRow>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  habit: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: Colors.line },
  habitLast: { borderBottomWidth: 0 },
  habitCopy: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center' },
  habitName: { ...Type.body, color: Colors.ink },
  habitMeta: { ...Type.caption, color: Colors.text3 },
  week: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOff: { backgroundColor: '#EBEEF2' },
  dotToday: { borderWidth: 1, borderColor: Colors.ink },
});

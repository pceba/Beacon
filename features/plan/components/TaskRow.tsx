import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { MoreHorizontal } from 'lucide-react-native';
import { CheckBox } from '../../../components/ui/CheckBox';
import { SwipeRow } from '../../../components/ui/SwipeRow';
import { Colors } from '../../../constants/colors';
import { Motion } from '../../../constants/motion';
import { Type } from '../../../constants/typography';
import { Task } from '../../../types/database';
import { taskTiming } from '../../../utils/taskMeta';

type Props = {
  task: Task;
  today: string;
  reduce: boolean;
  onToggle: (task: Task) => void;
  onRemove: (task: Task) => void;
};

const enter = FadeInDown.duration(Motion.enter);
const leave = FadeOut.duration(Motion.exit);
const layout = LinearTransition.duration(Motion.enter);
const fadeIn = FadeInDown.duration(Motion.reduced);
const fadeOut = FadeOut.duration(Motion.reduced);

// Fila de tarea del Plan: CheckBox, deslizar para borrar y ⋯ como alternativa visible.
export const TaskRow = memo(({ task, today, reduce, onToggle, onRemove }: Props) => {
  const timing = !task.completed ? taskTiming(task.deadline, today, task.priority) : null;
  return (
    <Animated.View entering={reduce ? fadeIn : enter} exiting={reduce ? fadeOut : leave} layout={reduce ? undefined : layout}>
      <SwipeRow label={`Eliminar ${task.title}`} onDelete={() => onRemove(task)}>
        <View style={styles.row}>
          <CheckBox done={task.completed} label={task.title} onPress={() => onToggle(task)} />
          <View style={styles.copy}>
            <Text style={[styles.title, task.completed ? styles.done : null]}>{task.title}</Text>
            {timing ? <Text style={timing.overdue ? styles.due : styles.when}>{timing.text}</Text> : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Opciones de ${task.title}`}
            hitSlop={10}
            onPress={() => onRemove(task)}
            style={styles.more}
          >
            <MoreHorizontal color={Colors.text3} size={18} />
          </Pressable>
        </View>
      </SwipeRow>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface },
  copy: { flex: 1, gap: 2 },
  title: { ...Type.body, color: Colors.ink },
  done: { color: Colors.text4, textDecorationLine: 'line-through' },
  due: { ...Type.caption, color: Colors.danger },
  when: { ...Type.caption, color: Colors.text2 },
  more: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});

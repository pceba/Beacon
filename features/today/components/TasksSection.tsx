import React, { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';
import { Card } from '../../../components/ui/Card';
import { CheckBox } from '../../../components/ui/CheckBox';
import { Colors } from '../../../constants/colors';
import { Type } from '../../../constants/typography';
import { Task } from '../../../types/database';
import { formatNumber } from '../../../utils/format';
import { taskTiming } from '../../../utils/taskMeta';
import { Entrance } from '../hooks/useEntrance';
import { sectionStyles } from './sectionStyles';

type Props = {
  tasks: Task[];
  todayKey: string;
  motion: Entrance;
  onOpenPlan: () => void;
  onToggle: (task: Task) => void;
  onAdd: (title: string) => Promise<boolean>;
};

export const TasksSection = memo(({ tasks, todayKey, motion, onOpenPlan, onToggle, onAdd }: Props) => {
  const entering = useMemo(() => motion.enter(8), [motion]);
  return (
    <>
      <Animated.View entering={motion.enter(7)} style={sectionStyles.head}>
        <Text style={sectionStyles.title}>
          Tareas <Text style={sectionStyles.meta}>{formatNumber(tasks.length)} hoy</Text>
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Ver plan" hitSlop={8} onPress={onOpenPlan} style={sectionStyles.linkHit}>
          <Text style={sectionStyles.link}>Ver plan</Text>
        </Pressable>
      </Animated.View>
      <Card inset>
        <TaskDraft onAdd={onAdd} />
        {tasks.length === 0 ? <Text style={sectionStyles.empty}>Nada pendiente.</Text> : null}
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} todayKey={todayKey} entering={entering} exiting={motion.exit} layout={motion.layout} onToggle={onToggle} />
        ))}
      </Card>
    </>
  );
});

// El borrador vive aquí para que escribir no repinte el resto de Hoy.
const TaskDraft = memo(({ onAdd }: { onAdd: (title: string) => Promise<boolean> }) => {
  const [draft, setDraft] = useState('');
  const submit = useCallback(async () => {
    const title = draft.trim();
    if (!title) return;
    setDraft('');
    if (!(await onAdd(title))) setDraft(title);
  }, [draft, onAdd]);
  return (
    <View style={styles.taskDraft}>
      <Plus color={Colors.text3} size={14} />
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={() => void submit()}
        placeholder="Añadir tarea para hoy"
        placeholderTextColor={Colors.text4}
        accessibilityLabel="Nueva tarea"
        returnKeyType="done"
        style={styles.taskInput}
      />
    </View>
  );
});

type RowProps = {
  task: Task;
  todayKey: string;
  entering: ReturnType<Entrance['enter']>;
  exiting: Entrance['exit'];
  layout: Entrance['layout'];
  onToggle: (task: Task) => void;
};

const TaskRow = memo(({ task, todayKey, entering, exiting, layout, onToggle }: RowProps) => {
  const toggle = useCallback(() => onToggle(task), [onToggle, task]);
  const timing = taskTiming(task.deadline, todayKey, task.priority);
  return (
    <Animated.View entering={entering} exiting={exiting} layout={layout} style={styles.task}>
      <CheckBox done={task.completed} label={task.title} onPress={toggle} />
      <View style={styles.taskCopy}>
        <Text numberOfLines={2} style={[styles.taskTitle, task.completed ? styles.taskDone : null]}>
          {task.title}
        </Text>
        {timing ? <Text style={timing.overdue ? styles.overdue : styles.when}>{timing.text}</Text> : null}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  taskDraft: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: Colors.line },
  taskInput: { flex: 1, minHeight: 44, ...Type.body, color: Colors.ink },
  task: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 },
  taskCopy: { flex: 1, gap: 2 },
  taskTitle: { ...Type.body, color: Colors.ink },
  taskDone: { color: Colors.text4, textDecorationLine: 'line-through' },
  when: { ...Type.caption, color: Colors.text2 },
  overdue: { ...Type.caption, color: Colors.danger },
});

import React, { memo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Card } from '../../../components/ui/Card';
import { Colors } from '../../../constants/colors';
import { Type } from '../../../constants/typography';
import { useReduceMotion } from '../../../hooks/useReduceMotion';
import { Task } from '../../../types/database';
import { formatNumber } from '../../../utils/format';
import { TaskActions } from '../hooks/useTaskActions';
import { TaskRow } from './TaskRow';

type Props = {
  day: string;
  today: string;
  tasks: Task[];
  actions: TaskActions;
};

// Tareas del día (Plan v1.2): añadir rápido con esa fecha, marcar y borrar con Deshacer.
export const TasksCard = memo(({ day, today, tasks, actions }: Props) => {
  const [draft, setDraft] = useState('');
  const reduce = useReduceMotion();
  const done = tasks.filter((task) => task.completed).length;

  const submit = async () => {
    const title = draft.trim();
    if (!title) return;
    setDraft('');
    const saved = await actions.add(title, day);
    if (!saved) setDraft(title);
  };

  return (
    <>
      <View style={styles.head}>
        <Text style={styles.section}>Tareas</Text>
        <Text style={styles.meta}>
          {formatNumber(done)} de {formatNumber(tasks.length)} hechas
        </Text>
      </View>
      <Card inset>
        <View style={styles.draft}>
          <Plus color={Colors.text3} size={14} />
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => void submit()}
            placeholder="Añadir tarea"
            placeholderTextColor={Colors.text4}
            accessibilityLabel="Añadir tarea"
            returnKeyType="done"
            style={styles.input}
          />
        </View>
        {tasks.length === 0 ? <Text style={styles.empty}>Sin tareas este día.</Text> : null}
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} today={today} reduce={reduce} onToggle={actions.toggle} onRemove={actions.remove} />
        ))}
      </Card>
    </>
  );
});

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  section: { ...Type.section, color: Colors.ink },
  meta: { ...Type.caption, color: Colors.text3 },
  draft: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.line },
  input: { flex: 1, minHeight: 44, ...Type.body, color: Colors.ink },
  empty: { ...Type.body, color: Colors.text3, paddingVertical: 14 },
});

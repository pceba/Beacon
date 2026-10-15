import React, { useState } from 'react';
import { toast } from '../../lib/toast';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { format } from 'date-fns';
import { FormScreen } from '../../components/ui/FormScreen';
import { TextField } from '../../components/ui/TextField';
import { Segmented } from '../../components/ui/Segmented';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { getCurrentUserId } from '../../services/authService';
import { createTask } from '../../services/taskService';
import { Task } from '../../types/database';
import { RootStackParamList } from '../../types/navigation';

export const AddTaskModal = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'AddTaskModal'>>();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const onSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Ponle un nombre.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const userId = await getCurrentUserId();
      await createTask(userId, {
        title: trimmed,
        description: notes.trim() || null,
        deadline: route.params?.date ?? format(new Date(), 'yyyy-MM-dd'),
        completed: false,
        priority,
      });
      navigation.goBack();
    } catch (saveError) {
      console.error(saveError);
      toast.show({ message: 'No se ha guardado', kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen title="Tarea" saveLabel="Guardar tarea" onSave={() => void onSave()} loading={saving}>
        <TextField label="Tarea" value={title} onChangeText={setTitle} placeholder="Llamar, comprar…" error={error} />
        <TextField label="Notas" value={notes} onChangeText={setNotes} placeholder="Opcional" multiline />
        <Text style={styles.label}>Prioridad</Text>
        <Segmented
          value={priority}
          onChange={setPriority}
          options={[
            { value: 'low', label: 'Baja' },
            { value: 'medium', label: 'Media' },
            { value: 'high', label: 'Alta' },
          ]}
        />
    </FormScreen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  label: {
    fontFamily: Typography.fontMedium,
    fontSize: Typography.sm,
    color: Colors.text2,
  },
});

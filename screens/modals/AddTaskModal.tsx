import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { format } from 'date-fns';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Segmented } from '../../components/Segmented';
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
      Alert.alert('No se ha guardado');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input label="Tarea" value={title} onChangeText={setTitle} placeholder="Llamar, comprar…" error={error} />
        <Input label="Notas" value={notes} onChangeText={setNotes} placeholder="Opcional" multiline />
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
        <Button title="Guardar" onPress={onSave} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  label: {
    fontFamily: Typography.fontMedium,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
});

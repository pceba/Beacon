import React, { useEffect, useState } from 'react';
import { toast } from '../../lib/toast';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { getCurrentUserId } from '../../services/authService';
import { createWorkout, createWorkoutFromTemplate, getWorkoutTemplates } from '../../services/workoutService';
import { WorkoutTemplate } from '../../types/database';
import { LogStackParamList } from '../../types/navigation';
import { useReturnToToday } from '../../utils/finishLog';

export const LogWorkoutScreen = () => {
  const navigation = useNavigation<NavigationProp<LogStackParamList>>();
  const route = useRoute<RouteProp<LogStackParamList, 'LogWorkoutScreen'>>();
  useReturnToToday(route.params?.fromToday);
  const [name, setName] = useState('');
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const userId = await getCurrentUserId();
        setTemplates(await getWorkoutTemplates(userId));
      } catch (error) {
        console.error(error);
      }
    };
    load();
  }, []);

  const startBlank = async () => {
    try {
      const userId = await getCurrentUserId();
      const workout = await createWorkout(userId, { name: name.trim() || 'Sesión', notes: null, duration_minutes: null, completed: false });
      navigation.navigate('WorkoutDetailScreen', { workoutId: workout.id, fromToday: route.params?.fromToday });
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha creado el entreno', kind: 'error' });
    }
  };

  const useTemplate = async (templateId: string) => {
    try {
      const userId = await getCurrentUserId();
      const workout = await createWorkoutFromTemplate(userId, templateId);
      navigation.navigate('WorkoutDetailScreen', { workoutId: workout.id, fromToday: route.params?.fromToday });
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha creado el entreno', kind: 'error' });
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Input label="Nombre" value={name} onChangeText={setName} placeholder="Piernas, torso…" />
      <Button title="Empezar" onPress={startBlank} />
      <Text style={styles.header}>Plantillas</Text>
      {templates.map((template) => (
        <Card key={template.id} onPress={() => useTemplate(template.id)}>
          <Text style={styles.title}>{template.name}</Text>
          {template.description ? <Text style={styles.subtitle}>{template.description}</Text> : null}
        </Card>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  header: { color: Colors.ink, fontFamily: Typography.fontBold, fontSize: Typography.md },
  title: { color: Colors.ink, fontFamily: Typography.fontBold, fontSize: Typography.lg },
  subtitle: { color: Colors.text2, fontFamily: Typography.fontRegular, fontSize: Typography.md },
});

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { getCurrentUserId } from '../../services/authService';
import { addExercise, addSet, getWorkoutById, updateWorkout } from '../../services/workoutService';
import { LogStackParamList } from '../../types/navigation';

type Route = RouteProp<LogStackParamList, 'WorkoutDetailScreen'>;

interface ExerciseView {
  id: string;
  name: string;
  sets: { reps: string; weight: string }[];
}

export const WorkoutDetailScreen = () => {
  const route = useRoute<Route>();
  const [workoutName, setWorkoutName] = useState('');
  const [exerciseName, setExerciseName] = useState('');
  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState('20');
  const [exerciseRows, setExerciseRows] = useState<ExerciseView[]>([]);
  const startedAt = useMemo(() => Date.now(), []);

  useEffect(() => {
    const load = async () => {
      try {
        const userId = await getCurrentUserId();
        const workout = await getWorkoutById(userId, route.params.workoutId);
        if (!workout) return;
        setWorkoutName(workout.name);
      } catch (error) {
        console.error(error);
      }
    };
    load();
  }, [route.params.workoutId]);

  const addExerciseInline = async () => {
    try {
      const userId = await getCurrentUserId();
      const exercise = await addExercise(userId, route.params.workoutId, {
        exercise_name: exerciseName,
        notes: null,
        order_index: exerciseRows.length,
      });
      setExerciseRows((prev) => [...prev, { id: exercise.id, name: exercise.exercise_name, sets: [] }]);
      setExerciseName('');
    } catch (error) {
      console.error(error);
      Alert.alert('No se ha añadido el ejercicio');
    }
  };

  const addSetInline = async (exerciseId: string) => {
    try {
      const userId = await getCurrentUserId();
      const row = exerciseRows.find((item) => item.id === exerciseId);
      const setNumber = (row?.sets.length ?? 0) + 1;
      await addSet(userId, exerciseId, {
        set_number: setNumber,
        reps: Number(reps),
        weight_kg: Number(weight),
        duration_seconds: null,
        completed: true,
      });
      setExerciseRows((prev) =>
        prev.map((item) =>
          item.id === exerciseId ? { ...item, sets: [...item.sets, { reps, weight }] } : item,
        ),
      );
    } catch (error) {
      console.error(error);
      Alert.alert('No se ha añadido la serie');
    }
  };

  const finishWorkout = async () => {
    try {
      const userId = await getCurrentUserId();
      const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
      await updateWorkout(userId, route.params.workoutId, { completed: true, duration_minutes: minutes, name: workoutName });
      Alert.alert('Done', 'Workout finished.');
    } catch (error) {
      console.error(error);
      Alert.alert('No se ha cerrado el entreno');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{workoutName || 'Sesión'}</Text>
      <Text style={styles.subtitle}>{Math.max(0, Math.round((Date.now() - startedAt) / 60000))} min</Text>
      <Input label="Ejercicio" value={exerciseName} onChangeText={setExerciseName} />
      <Button title="Añadir ejercicio" onPress={addExerciseInline} />
      {exerciseRows.map((exercise) => (
        <Card key={exercise.id}>
          <Text style={styles.exercise}>{exercise.name}</Text>
          {exercise.sets.map((set, idx) => (
            <Text key={`${exercise.id}-${idx}`} style={styles.row}>
              Serie {idx + 1}: {set.reps} × {set.weight} kg
            </Text>
          ))}
          <View style={styles.inline}>
            <Input label="Reps" value={reps} onChangeText={setReps} keyboardType="numeric" />
            <Input label="Peso" value={weight} onChangeText={setWeight} keyboardType="numeric" />
          </View>
          <Button title="Añadir serie" variant="secondary" onPress={() => addSetInline(exercise.id)} />
        </Card>
      ))}
      <Button title="Terminar" onPress={finishWorkout} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  title: { color: Colors.textPrimary, fontFamily: Typography.fontBold, fontSize: Typography.xl },
  subtitle: { color: Colors.textSecondary, fontFamily: Typography.fontRegular, fontSize: Typography.sm },
  exercise: { color: Colors.brownPrimary, fontFamily: Typography.fontBold, fontSize: Typography.lg },
  row: { color: Colors.textPrimary, fontFamily: Typography.fontRegular, fontSize: Typography.md },
  inline: { flexDirection: 'row', gap: Spacing.sm },
});

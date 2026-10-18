import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { toast } from '../../lib/toast';
import { success } from '../../lib/haptics';
import { FormScreen } from '../../components/ui/FormScreen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { TextField } from '../../components/ui/TextField';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Type, tabular } from '../../constants/typography';
import { getCurrentUserId } from '../../services/authService';
import { addExercise, addSet, getStrengthEntries, getWorkoutById, getWorkoutExercises, updateSet, updateWorkout } from '../../services/workoutService';
import { LogStackParamList } from '../../types/navigation';
import { finishLog, useReturnToToday } from '../../utils/finishLog';
import { beatsBest, epley, formatLastTime, lastPerformance, LoggedExercise, maxE1rm, normalizeExerciseName } from '../../utils/exerciseProgress';
import { formatFlexible, formatNumber } from '../../utils/format';

type Route = RouteProp<LogStackParamList, 'WorkoutDetailScreen'>;

type SetView = { id: string; reps: string; weight: string; completed: boolean };

type ExerciseView = { id: string; name: string; sets: SetView[] };

const numberOrNull = (value: string) => {
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export const WorkoutDetailScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  useReturnToToday(route.params.fromToday);
  const [workoutName, setWorkoutName] = useState('');
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseRows, setExerciseRows] = useState<ExerciseView[]>([]);
  const [history, setHistory] = useState<LoggedExercise[]>([]);
  const startedAt = useMemo(() => Date.now(), []);
  const celebrated = useRef(new Set<string>());
  const rowsRef = useRef<ExerciseView[]>([]);
  rowsRef.current = exerciseRows;

  useEffect(() => {
    const load = async () => {
      try {
        const userId = await getCurrentUserId();
        const [workout, exercises, entries] = await Promise.all([
          getWorkoutById(userId, route.params.workoutId),
          getWorkoutExercises(userId, route.params.workoutId),
          getStrengthEntries(userId),
        ]);
        if (workout) setWorkoutName(workout.name);
        setHistory(entries.filter((entry) => entry.workoutId !== route.params.workoutId));
        setExerciseRows(
          exercises.map((exercise) => ({
            id: exercise.id,
            name: exercise.exercise_name,
            sets: exercise.sets.map((set) => ({
              id: set.id,
              reps: set.reps == null ? '' : formatNumber(set.reps),
              weight: set.weight_kg == null ? '' : formatFlexible(set.weight_kg, 1),
              completed: set.completed,
            })),
          })),
        );
      } catch (error) {
        console.error(error);
        toast.show({ message: 'No se ha podido abrir el entreno', kind: 'error' });
      }
    };
    void load();
  }, [route.params.workoutId]);

  const priorBest = (name: string, ignoreSetId?: string) => {
    const key = normalizeExerciseName(name);
    let best = maxE1rm(history, name);
    exerciseRows.forEach((exercise) => {
      if (normalizeExerciseName(exercise.name) !== key) return;
      exercise.sets.forEach((set) => {
        if (!set.completed || set.id === ignoreSetId) return;
        const estimate = epley(numberOrNull(set.weight) ?? 0, numberOrNull(set.reps) ?? 0);
        if (estimate != null && (best == null || estimate > best)) best = estimate;
      });
    });
    return best;
  };

  const isRecord = (exercise: ExerciseView, set: SetView) => {
    if (!set.completed) return false;
    const weight = numberOrNull(set.weight);
    const reps = numberOrNull(set.reps);
    if (weight == null || reps == null) return false;
    return beatsBest(priorBest(exercise.name, set.id), weight, reps);
  };

  const saveSet = async (set: SetView, patch: Partial<Pick<SetView, 'reps' | 'weight' | 'completed'>>) => {
    const next = { ...set, ...patch };
    const userId = await getCurrentUserId();
    await updateSet(userId, set.id, {
      reps: numberOrNull(next.reps),
      weight_kg: numberOrNull(next.weight),
      completed: next.completed,
    });
  };

  const addExerciseInline = async () => {
    const name = exerciseName.trim();
    if (!name) return;
    try {
      const userId = await getCurrentUserId();
      const previous = lastPerformance(history, name);
      const exercise = await addExercise(userId, route.params.workoutId, {
        exercise_name: name,
        notes: null,
        order_index: exerciseRows.length,
      });
      const sets: SetView[] = [];
      for (const [index, set] of (previous ?? []).entries()) {
        const saved = await addSet(userId, exercise.id, {
          set_number: index + 1,
          reps: set.reps,
          weight_kg: set.weightKg,
          duration_seconds: null,
          completed: false,
        });
        sets.push({
          id: saved.id,
          reps: set.reps == null ? '' : formatNumber(set.reps),
          weight: set.weightKg == null ? '' : formatFlexible(set.weightKg, 1),
          completed: false,
        });
      }
      setExerciseRows((prev) => [...prev, { id: exercise.id, name: exercise.exercise_name, sets }]);
      setExerciseName('');
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha añadido el ejercicio', kind: 'error' });
    }
  };

  const addSetInline = async (exerciseId: string) => {
    try {
      const userId = await getCurrentUserId();
      const row = exerciseRows.find((item) => item.id === exerciseId);
      const setNumber = (row?.sets.length ?? 0) + 1;
      const saved = await addSet(userId, exerciseId, {
        set_number: setNumber,
        reps: null,
        weight_kg: null,
        duration_seconds: null,
        completed: false,
      });
      setExerciseRows((prev) =>
        prev.map((item) => (item.id === exerciseId ? { ...item, sets: [...item.sets, { id: saved.id, reps: '', weight: '', completed: false }] } : item)),
      );
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha añadido la serie', kind: 'error' });
    }
  };

  const changeSet = (exerciseId: string, setId: string, patch: Partial<SetView>) => {
    setExerciseRows((prev) => {
      const next = prev.map((item) =>
        item.id === exerciseId ? { ...item, sets: item.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)) } : item,
      );
      rowsRef.current = next;
      return next;
    });
  };

  const toggleSet = async (exercise: ExerciseView, set: SetView) => {
    const next = !set.completed;
    const weight = numberOrNull(set.weight);
    const reps = numberOrNull(set.reps);
    try {
      await saveSet(set, { completed: next });
      changeSet(exercise.id, set.id, { completed: next });
      const record = next && weight != null && reps != null && beatsBest(priorBest(exercise.name, set.id), weight, reps);
      if (record && !celebrated.current.has(set.id)) {
        celebrated.current.add(set.id);
        success();
      }
      if (!next) celebrated.current.delete(set.id);
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha guardado la serie', kind: 'error' });
    }
  };

  const blurSet = async (exerciseId: string, setId: string) => {
    const set = rowsRef.current.find((item) => item.id === exerciseId)?.sets.find((item) => item.id === setId);
    if (!set) return;
    try {
      await saveSet(set, {});
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha guardado la serie', kind: 'error' });
    }
  };

  const finishWorkout = async () => {
    try {
      const userId = await getCurrentUserId();
      const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
      await updateWorkout(userId, route.params.workoutId, { completed: true, duration_minutes: minutes, name: workoutName.trim() || 'Sesión' });
      finishLog(navigation, route.params.fromToday);
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha cerrado el entreno', kind: 'error' });
    }
  };

  const typedCaption = formatLastTime(lastPerformance(history, exerciseName) ?? []);

  return (
    <FormScreen title="Sesión" saveLabel="Terminar entreno" onSave={() => void finishWorkout()}>
      <Text style={styles.title}>{workoutName || 'Sesión'}</Text>
      <Text style={styles.subtitle}>{formatNumber(Math.max(0, Math.round((Date.now() - startedAt) / 60000)))} min</Text>
      <TextField label="Ejercicio" value={exerciseName} onChangeText={setExerciseName} placeholder="Sentadilla, press banca…" />
      {typedCaption ? <Text style={styles.caption}>{typedCaption}</Text> : null}
      <Button title="Añadir ejercicio" onPress={() => void addExerciseInline()} />
      {exerciseRows.map((exercise) => {
        const caption = formatLastTime(lastPerformance(history, exercise.name) ?? []);
        return (
          <Card key={exercise.id}>
            <Text style={styles.exercise}>{exercise.name}</Text>
            {caption ? <Text style={styles.caption}>{caption}</Text> : null}
            {exercise.sets.map((set, index) => (
              <View key={set.id} style={styles.setBlock}>
                <View style={styles.inline}>
                  <View style={styles.field}>
                    <TextField
                      label={`Reps ${formatNumber(index + 1)}`}
                      value={set.reps}
                      onChangeText={(reps) => changeSet(exercise.id, set.id, { reps })}
                      onBlur={() => void blurSet(exercise.id, set.id)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                  <View style={styles.field}>
                    <TextField
                      label="Peso"
                      value={set.weight}
                      onChangeText={(weight) => changeSet(exercise.id, set.id, { weight })}
                      onBlur={() => void blurSet(exercise.id, set.id)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                    />
                  </View>
                </View>
                <View style={styles.setMeta}>
                  <Pressable accessibilityRole="button" accessibilityLabel={set.completed ? 'Serie hecha' : 'Marcar serie'} onPress={() => void toggleSet(exercise, set)} style={styles.mark}>
                    <Text style={[styles.markText, set.completed ? styles.markOn : null]}>{set.completed ? 'Hecha' : 'Marcar'}</Text>
                  </Pressable>
                  {isRecord(exercise, set) ? (
                    <View style={styles.pr}>
                      <Text style={styles.prText}>PR</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
            <Button title="Añadir serie" variant="secondary" onPress={() => void addSetInline(exercise.id)} />
          </Card>
        );
      })}
    </FormScreen>
  );
};

const styles = StyleSheet.create({
  title: { color: Colors.ink, fontFamily: 'Outfit_600SemiBold', fontSize: 26, lineHeight: 32 },
  subtitle: { ...Type.caption, color: Colors.text2 },
  exercise: { ...Type.bodyStrong, color: Colors.ink },
  caption: { ...Type.caption, color: Colors.text3 },
  setBlock: { gap: Spacing.sm },
  inline: { flexDirection: 'row', gap: Spacing.sm },
  field: { flex: 1 },
  setMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  markText: { ...Type.bodyStrong, color: Colors.text2 },
  markOn: { color: Colors.ink },
  pr: { borderRadius: 999, backgroundColor: Colors.successSoft, paddingHorizontal: 8, paddingVertical: 3 },
  prText: { ...tabular, fontFamily: 'Outfit_600SemiBold', fontSize: 11, color: Colors.success },
});

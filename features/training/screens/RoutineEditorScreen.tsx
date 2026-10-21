import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../../components/ui/Button';
import { FormScreen } from '../../../components/ui/FormScreen';
import { Sheet } from '../../../components/ui/Sheet';
import { Colors } from '../../../constants/colors';
import { Spacing } from '../../../constants/spacing';
import { Type } from '../../../constants/typography';
import { toast } from '../../../lib/toast';
import { getCurrentUserId } from '../../../services/authService';
import { ROUTINE_LIMITS, RoutineDraft, saveRoutine } from '../../../services/routineService';
import { LogStackParamList } from '../../../types/navigation';
import { uuid } from '../../../utils/uuid';
import { ExercisePicker } from '../components/ExercisePicker';
import { FieldError } from '../components/FieldError';
import { RoutineExerciseCard, RoutineItem, RoutineItemHandlers } from '../components/RoutineExerciseCard';
import { refreshRoutines } from '../navigation';
import { sanitizeDecimal, toWeightKg, weightText } from '../numbers';
import { trainingQueries } from '../trainingQueries';

type Route = RouteProp<LogStackParamList, 'RoutineEditorScreen'>;

const clamp = (value: number, [min, max]: readonly [number, number]) => Math.min(max, Math.max(min, value));

const toItems = (draft: RoutineDraft): RoutineItem[] =>
  draft.exercises.map((exercise) => ({ id: exercise.id, name: exercise.name, sets: exercise.sets, reps: exercise.reps, weight: weightText(exercise.weightKg) }));

// Editor de rutina (DESIGN.md §7.2). Se guarda con «Guardar rutina», no al momento.
export const RoutineEditorScreen = () => {
  const navigation = useNavigation();
  const { templateId, fromWorkoutId } = useRoute<Route>().params ?? {};
  const routine = useQuery({ ...trainingQueries.routine(templateId ?? ''), enabled: !!templateId });
  const fromWorkout = useQuery({ ...trainingQueries.routineFromWorkout(fromWorkoutId ?? ''), enabled: !templateId && !!fromWorkoutId });
  const source = templateId ? routine : fromWorkoutId ? fromWorkout : null;
  const [name, setName] = useState('');
  const [items, setItems] = useState<RoutineItem[]>([]);
  const [seeded, setSeeded] = useState(!source);
  const [error, setError] = useState<'name' | 'empty' | null>(null);
  const [focused, setFocused] = useState(false);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    if (seeded || !source?.data) return;
    setName(source.data.name);
    setItems(toItems(source.data));
    setSeeded(true);
  }, [seeded, source?.data]);

  useEffect(() => {
    if (!source?.isError) return;
    toast.show({ message: 'No se ha podido cargar la rutina.', kind: 'error' });
    setSeeded(true);
  }, [source?.isError]);

  const handlers = useMemo<RoutineItemHandlers>(
    () => ({
      onStep: (id, field, delta) =>
        setItems((current) =>
          current.map((item) => (item.id === id ? { ...item, [field]: clamp(item[field] + delta, field === 'sets' ? ROUTINE_LIMITS.sets : ROUTINE_LIMITS.reps) } : item)),
        ),
      onWeight: (id, text) => setItems((current) => current.map((item) => (item.id === id ? { ...item, weight: sanitizeDecimal(text) } : item))),
      onMove: (id, delta) =>
        setItems((current) => {
          const from = current.findIndex((item) => item.id === id);
          const to = from + delta;
          if (from < 0 || to < 0 || to >= current.length) return current;
          const next = [...current];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);
          return next;
        }),
      onRemove: (id) => {
        const index = itemsRef.current.findIndex((item) => item.id === id);
        const removed = itemsRef.current[index];
        if (!removed) return;
        setItems((current) => current.filter((item) => item.id !== id));
        toast.show({
          message: 'Ejercicio quitado',
          action: {
            label: 'Deshacer',
            onPress: () => setItems((current) => (current.some((item) => item.id === id) ? current : [...current.slice(0, index), removed, ...current.slice(index)])),
          },
        });
      },
    }),
    [],
  );

  const onPick = useCallback((names: string[]) => {
    setPicking(false);
    setError((current) => (current === 'empty' ? null : current));
    setItems((current) => [...current, ...names.map((exerciseName) => ({ id: uuid(), name: exerciseName, sets: 3, reps: 10, weight: '' }))]);
  }, []);

  const save = async () => {
    if (saving) return;
    if (!name.trim()) return setError('name');
    if (items.length === 0) return setError('empty');
    setSaving(true);
    try {
      await saveRoutine(await getCurrentUserId(), {
        id: templateId ?? null,
        name,
        exercises: items.map((item) => ({ id: item.id, name: item.name, sets: item.sets, reps: item.reps, weightKg: toWeightKg(item.weight) })),
      });
      void refreshRoutines();
      toast.show({ message: 'Rutina guardada', kind: 'success' });
      navigation.goBack();
    } catch (cause) {
      console.error(cause);
      toast.show({ message: 'No se ha guardado la rutina. Inténtalo otra vez.', kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen title="Rutina" saveLabel="Guardar rutina" onSave={() => void save()} loading={saving}>
      {!seeded ? (
        <ActivityIndicator color={Colors.text3} style={styles.loading} />
      ) : (
        <>
          <TextInput
            accessibilityLabel="Nombre de la rutina"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (error === 'name') setError(null);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Nombre de la rutina"
            placeholderTextColor={Colors.text4}
            maxLength={ROUTINE_LIMITS.name}
            style={[styles.name, focused ? styles.nameFocused : null]}
          />
          {error === 'name' ? <FieldError title="Ponle un nombre" /> : null}
          {items.map((item, index) => (
            <RoutineExerciseCard key={item.id} item={item} first={index === 0} last={index === items.length - 1} handlers={handlers} />
          ))}
          {error === 'empty' ? <FieldError title="Añade al menos un ejercicio" /> : null}
          <View style={styles.add}>
            <Button title="Añadir ejercicios" variant="secondary" onPress={() => setPicking(true)} />
          </View>
        </>
      )}
      <Sheet visible={picking} onClose={() => setPicking(false)} fullHeight label="Elegir ejercicios">
        <ExercisePicker mode="multi" onConfirm={onPick} />
      </Sheet>
    </FormScreen>
  );
};

const styles = StyleSheet.create({
  loading: { marginTop: Spacing.xxl },
  name: {
    ...Type.headline,
    fontSize: 24,
    lineHeight: 30,
    color: Colors.ink,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: Colors.line,
  },
  nameFocused: { borderBottomColor: Colors.accent },
  add: { marginTop: Spacing.xs },
});

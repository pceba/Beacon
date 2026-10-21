import { useCallback, useMemo, useRef, useState } from 'react';
import { NavigationProp, StackActions, useNavigation } from '@react-navigation/native';
import { optimistic } from '../../../lib/optimistic';
import { toast } from '../../../lib/toast';
import { getCurrentUserId } from '../../../services/authService';
import { deleteRoutine, duplicateRoutine, RoutineSummary } from '../../../services/routineService';
import { createWorkout, deleteWorkout } from '../../../services/workoutService';
import { createWorkoutFromTemplate, createWorkoutFromWorkout } from '../../../services/workoutSessionService';
import { Workout } from '../../../types/database';
import { LogStackParamList } from '../../../types/navigation';
import { refreshRoutines, refreshTraining } from '../navigation';
import { trainingKeys } from '../trainingQueries';

// Acciones de Empezar. Al crear un entreno se sustituye esta pantalla por la sesión.
export const useStartActions = (fromToday?: boolean) => {
  const navigation = useNavigation<NavigationProp<LogStackParamList>>();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const open = useCallback(
    (workoutId: string) => navigation.dispatch(StackActions.replace('WorkoutDetailScreen', { workoutId, fromToday, mode: 'live' })),
    [fromToday, navigation],
  );

  const run = useCallback(
    async (create: (userId: string) => Promise<Workout>) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      try {
        const workout = await create(await getCurrentUserId());
        void refreshTraining();
        open(workout.id);
      } catch (error) {
        console.error(error);
        toast.show({ message: 'No se ha podido empezar el entreno. Inténtalo otra vez.', kind: 'error' });
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [open],
  );

  const startBlank = useCallback(
    () => void run((userId) => createWorkout(userId, { name: 'Entreno', notes: null, duration_minutes: null, completed: false })),
    [run],
  );
  const repeat = useCallback((workoutId: string) => void run((userId) => createWorkoutFromWorkout(userId, workoutId)), [run]);
  const startRoutine = useCallback((templateId: string) => void run((userId) => createWorkoutFromTemplate(userId, templateId)), [run]);

  const discardActive = useCallback(async (workoutId: string) => {
    try {
      await deleteWorkout(await getCurrentUserId(), workoutId);
      toast.show({ message: 'Entreno descartado' });
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha podido descartar el entreno.', kind: 'error' });
    } finally {
      void refreshTraining();
    }
  }, []);

  const duplicate = useCallback(async (templateId: string) => {
    try {
      await duplicateRoutine(await getCurrentUserId(), templateId);
      toast.show({ message: 'Rutina duplicada' });
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha podido duplicar la rutina.', kind: 'error' });
    } finally {
      void refreshRoutines();
    }
  }, []);

  const removeRoutine = useCallback(async (templateId: string) => {
    const done = await optimistic<RoutineSummary[], true>({
      key: trainingKeys.routines(),
      apply: (current) => current?.filter((routine) => routine.id !== templateId),
      run: async () => {
        await deleteRoutine(await getCurrentUserId(), templateId);
        return true;
      },
      tables: ['workout_templates', 'workout_template_exercises'],
      error: 'No se ha podido eliminar la rutina.',
    });
    if (done) toast.show({ message: 'Rutina eliminada' });
  }, []);

  const goTo = useMemo(
    () => ({
      editRoutine: (templateId: string) => navigation.navigate('RoutineEditorScreen', { templateId }),
      newRoutine: () => navigation.navigate('RoutineEditorScreen', {}),
      history: () => navigation.navigate('WorkoutHistoryScreen'),
    }),
    [navigation],
  );

  return { busy, open, startBlank, repeat, startRoutine, discardActive, duplicate, removeRoutine, ...goTo };
};

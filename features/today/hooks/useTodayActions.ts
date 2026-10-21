import { useCallback, useRef } from 'react';
import { light, medium, selection } from '../../../lib/haptics';
import { optimistic } from '../../../lib/optimistic';
import { invalidateTables, queryClient } from '../../../lib/query';
import { toast } from '../../../lib/toast';
import { getCurrentUserId } from '../../../services/authService';
import { createHabit, deleteHabit, toggleHabit } from '../../../services/habitService';
import { upsertMoodLog } from '../../../services/moodService';
import { defaultPreferences, Preferences } from '../../../services/preferencesService';
import { createSleepLog, deleteSleepLog, updateSleepLog } from '../../../services/sleepService';
import { createTask, toggleTaskCompleted } from '../../../services/taskService';
import { addWater, upsertWaterLog } from '../../../services/waterService';
import { createWorkout, deleteWorkout } from '../../../services/workoutService';
import { Habit, HabitLog, MoodLog, SleepLog, Task, WaterLog, Workout } from '../../../types/database';
import { dayOf, fromKey } from '../../../utils/dates';
import { todayKeys } from '../todayQueries';
import { sleepHours } from './useTodayData';

const PENDING_MOVE = 'local-move';

const patchTasks = (update: (tasks: Task[]) => Task[]) =>
  queryClient.setQueryData<Task[]>(todayKeys.openTasks(), (current) => (current ? update(current) : current));

const withCompleted = (id: string, completed: boolean) => (tasks: Task[]) =>
  tasks.map((item) => (item.id === id ? { ...item, completed } : item));

// Todas las acciones leen el estado de la caché en el momento, así sus referencias
// solo cambian con el día y las filas memorizadas no se repintan por ellas.
export const useTodayActions = (todayKey: string, openWorkout: () => void) => {
  const sleepLock = useRef(false);
  const moveLock = useRef(false);
  const taskTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const changeWater = useCallback(
    (delta: number) => {
      light();
      const key = todayKeys.water(todayKey);
      void optimistic<WaterLog | null, WaterLog>({
        key,
        apply: (current) => {
          const amount_ml = Math.max(0, (current?.amount_ml ?? 0) + delta);
          return current ? { ...current, amount_ml } : { id: 'local-water', user_id: '', log_date: todayKey, amount_ml, created_at: '' };
        },
        run: async () => {
          const userId = await getCurrentUserId();
          if (delta > 0) return addWater(userId, fromKey(todayKey), delta);
          return upsertWaterLog(userId, todayKey, queryClient.getQueryData<WaterLog | null>(key)?.amount_ml ?? 0);
        },
        revert: (current) => (current ? { ...current, amount_ml: Math.max(0, current.amount_ml - delta) } : current),
        tables: ['water_logs'],
        error: 'No se ha guardado el agua',
      });
    },
    [todayKey],
  );

  const onMoodChange = useCallback(
    (value: number) => {
      selection();
      void optimistic<MoodLog | null, MoodLog>({
        key: todayKeys.mood(todayKey),
        apply: (current) =>
          current
            ? { ...current, mood_score: value }
            : { id: 'local-mood', user_id: '', log_date: todayKey, mood_score: value, energy_score: null, notes: null, created_at: '' },
        run: async () =>
          upsertMoodLog(await getCurrentUserId(), { log_date: todayKey, mood_score: value, energy_score: null, notes: null }),
        commit: (_current, saved) => saved,
        tables: ['mood_logs'],
        error: 'No se ha guardado el ánimo',
      });
    },
    [todayKey],
  );

  // Paso de media hora sobre el sueño de hoy (sin control en la interfaz ahora mismo).
  const changeSleep = useCallback(
    async (direction: 1 | -1) => {
      if (sleepLock.current) return;
      sleepLock.current = true;
      const key = todayKeys.sleep(todayKey);
      const row = queryClient.getQueryData<SleepLog | null>(key) ?? null;
      const goal = queryClient.getQueryData<Preferences>(todayKeys.preferences())?.sleepHours ?? defaultPreferences.sleepHours;
      const current = row ? sleepHours(row.bed_time, row.wake_time) : 0;
      const next = current <= 0 && direction > 0 ? goal : Math.max(0, Math.round((current + direction * 0.5) * 2) / 2);
      const wake = fromKey(todayKey);
      wake.setHours(7, 0, 0, 0);
      const bed = new Date(wake.getTime() - next * 3_600_000);
      const times = { bed_time: bed.toISOString(), wake_time: wake.toISOString() };
      light();
      await optimistic<SleepLog | null, SleepLog | null>({
        key,
        apply: () =>
          next <= 0 ? null : { id: 'local-sleep', user_id: '', quality_rating: null, notes: null, created_at: '', ...row, ...times },
        run: async () => {
          const userId = await getCurrentUserId();
          if (next <= 0) {
            if (row) await deleteSleepLog(userId, row.id);
            return null;
          }
          if (row) return updateSleepLog(userId, row.id, times);
          return createSleepLog(userId, { ...times, quality_rating: null, notes: null });
        },
        commit: (_current, saved) => saved,
        tables: ['sleep_logs'],
        error: 'No se ha guardado el sueño',
      });
      sleepLock.current = false;
    },
    [todayKey],
  );

  const toggleMove = useCallback(async () => {
    if (moveLock.current) return;
    const key = todayKeys.workouts(todayKey);
    const list = queryClient.getQueryData<Workout[]>(key) ?? [];
    const quick = list.find((workout) => workout.notes === 'rapido');
    if (list.length > 0 && !quick) {
      openWorkout();
      return;
    }
    moveLock.current = true;
    light();
    if (quick) {
      await optimistic<Workout[], void>({
        key,
        apply: (current) => current?.filter((workout) => workout.id !== quick.id),
        run: async () => deleteWorkout(await getCurrentUserId(), quick.id),
        revert: (current) => [quick, ...(current ?? []).filter((workout) => workout.id !== quick.id)],
        tables: ['workouts'],
        error: 'No se ha guardado el movimiento',
      });
    } else {
      const draft: Workout = {
        id: PENDING_MOVE,
        user_id: '',
        started_at: new Date().toISOString(),
        name: 'Movimiento',
        notes: 'rapido',
        duration_minutes: null,
        completed: true,
      };
      await optimistic<Workout[], Workout>({
        key,
        apply: (current) => [draft, ...(current ?? [])],
        run: async () =>
          createWorkout(await getCurrentUserId(), { name: 'Movimiento', notes: 'rapido', completed: true, duration_minutes: null }),
        commit: (current, created) => current?.map((workout) => (workout.id === PENDING_MOVE ? created : workout)),
        revert: (current) => current?.filter((workout) => workout.id !== PENDING_MOVE),
        tables: ['workouts'],
        error: 'No se ha guardado el movimiento',
      });
    }
    moveLock.current = false;
  }, [openWorkout, todayKey]);

  const onToggleHabit = useCallback(
    (habit: Habit) => {
      const key = todayKeys.habitLogs(todayKey);
      const isToday = (log: HabitLog) => log.habit_id === habit.id && dayOf(log.log_date) === todayKey;
      const wasDone = (queryClient.getQueryData<HabitLog[]>(key) ?? []).some((log) => isToday(log) && log.completed);
      const localId = `local-${habit.id}`;
      medium();
      void optimistic<HabitLog[], HabitLog>({
        key,
        apply: (current) => [
          ...(current ?? []).filter((log) => !isToday(log)),
          { id: localId, habit_id: habit.id, user_id: '', log_date: todayKey, completed: !wasDone, notes: null },
        ],
        run: async () => toggleHabit(await getCurrentUserId(), habit.id, fromKey(todayKey)),
        commit: (current, saved) => [...(current ?? []).filter((log) => log.id !== localId && log.id !== saved.id), saved],
        revert: (current) => current?.map((log) => (log.id === localId ? { ...log, completed: wasDone } : log)),
        tables: ['habit_logs'],
        error: 'No se ha actualizado el hábito',
      });
    },
    [todayKey],
  );

  const restoreHabit = useCallback(async (habit: Habit) => {
    try {
      const created = await createHabit(await getCurrentUserId(), {
        name: habit.name,
        icon: habit.icon,
        color: habit.color,
        frequency: habit.frequency,
      });
      queryClient.setQueryData<Habit[]>(todayKeys.habits(), (current) => [...(current ?? []), created]);
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha podido recuperar el hábito.', kind: 'error' });
    } finally {
      void invalidateTables('habits');
    }
  }, []);

  const onDeleteHabit = useCallback(
    async (habit: Habit) => {
      const deleted = await optimistic<Habit[], true>({
        key: todayKeys.habits(),
        apply: (current) => current?.filter((item) => item.id !== habit.id),
        run: async () => {
          await deleteHabit(await getCurrentUserId(), habit.id);
          return true;
        },
        tables: ['habits'],
        error: 'No se ha podido eliminar.',
      });
      if (!deleted) return;
      toast.show({ message: 'Hábito eliminado', action: { label: 'Deshacer', onPress: () => void restoreHabit(habit) } });
    },
    [restoreHabit],
  );

  const undoTask = useCallback((task: Task) => {
    void optimistic<Task[], Task>({
      key: todayKeys.openTasks(),
      apply: (current) => [{ ...task, completed: false }, ...(current ?? []).filter((item) => item.id !== task.id)],
      run: async () => toggleTaskCompleted(await getCurrentUserId(), { ...task, completed: true }),
      revert: (current) => current?.filter((item) => item.id !== task.id),
      tables: ['tasks'],
      error: 'No se ha podido deshacer',
    });
  }, []);

  // Se marca al momento y se guarda a los 600 ms; tocar otra vez antes lo cancela.
  const onToggleTask = useCallback(
    (task: Task) => {
      const timer = taskTimers.current[task.id];
      if (timer) {
        clearTimeout(timer);
        delete taskTimers.current[task.id];
        patchTasks(withCompleted(task.id, false));
        return;
      }
      patchTasks(withCompleted(task.id, true));
      taskTimers.current[task.id] = setTimeout(() => {
        delete taskTimers.current[task.id];
        void optimistic<Task[], Task>({
          key: todayKeys.openTasks(),
          apply: (current) => current?.filter((item) => item.id !== task.id),
          run: async () => toggleTaskCompleted(await getCurrentUserId(), task),
          revert: (current) => [{ ...task, completed: false }, ...(current ?? []).filter((item) => item.id !== task.id)],
          tables: ['tasks'],
          error: 'No se ha actualizado la tarea',
        }).then((saved) => {
          if (saved) toast.show({ message: 'Tarea hecha', action: { label: 'Deshacer', onPress: () => undoTask(task) } });
        });
      }, 600);
    },
    [undoTask],
  );

  const addTask = useCallback(
    async (title: string) => {
      try {
        const created = await createTask(await getCurrentUserId(), {
          title,
          description: null,
          deadline: todayKey,
          completed: false,
          priority: 'medium',
        });
        queryClient.setQueryData<Task[]>(todayKeys.openTasks(), (current) => [created, ...(current ?? [])]);
        void invalidateTables('tasks');
        return true;
      } catch (error) {
        console.error(error);
        toast.show({ message: 'No se ha guardado la tarea', kind: 'error' });
        return false;
      }
    },
    [todayKey],
  );

  return { changeWater, onMoodChange, changeSleep, toggleMove, onToggleHabit, onDeleteHabit, onToggleTask, addTask };
};

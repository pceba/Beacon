import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '../lib/toast';
import { warning } from '../lib/haptics';
import { onDayRefresh } from '../lib/refresh';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, isToday, subDays } from 'date-fns';
import { Check, ChevronRight, Droplets, Dumbbell, Minus, Moon, Plus, Sparkles, Utensils } from 'lucide-react-native';
import { Card } from '../components/Card';
import { CheckRow } from '../components/CheckRow';
import { EmptyState } from '../components/EmptyState';
import { HabitRow } from '../components/HabitRow';
import { LineRow } from '../components/LineRow';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionHeader } from '../components/SectionHeader';
import { Colors } from '../constants/colors';
import { Radius, Spacing, tabClearance } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { getCurrentUserId } from '../services/authService';
import { createHabit, deleteHabit, getHabitLogs, getHabits, toggleHabit } from '../services/habitService';
import { getMoodLog, migrateMoodScores, upsertMoodLog } from '../services/moodService';
import { MOODS, moodScale } from '../utils/mood';
import { getNutritionLogs } from '../services/nutritionService';
import { getPreferences, Preferences } from '../services/preferencesService';
import { createSleepLog, deleteSleepLog, getSleepLogs, updateSleepLog } from '../services/sleepService';
import { createTask, getTasks, toggleTaskCompleted } from '../services/taskService';
import { addWater, getWaterLog, upsertWaterLog } from '../services/waterService';
import { createWorkout, deleteWorkout, getWorkouts } from '../services/workoutService';
import { Habit, HabitLog, Task } from '../types/database';
import { MainTabParamList, RootStackParamList } from '../types/navigation';
import { dayBrief } from '../utils/dayBrief';
import { dayRhythm } from '../utils/dayRhythm';
import { shortDay, weekdayHeading } from '../utils/labels';
import { habitStreak } from '../utils/streak';

type TodayNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Today'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Summary = { calories: number; sleep: number; workout: boolean; waterMl: number };

const sleepHours = (bed: string, wake: string) => {
  const hours = (new Date(wake).getTime() - new Date(bed).getTime()) / 3_600_000;
  if (!Number.isFinite(hours) || hours <= 0) return 0;
  return Number(Math.min(hours, 24).toFixed(1));
};

export const TodayScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<TodayNav>();
  const [refreshing, setRefreshing] = useState(false);
  const [mood, setMood] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [summary, setSummary] = useState<Summary>({ calories: 0, sleep: 0, workout: false, waterMl: 0 });
  const [sleepId, setSleepId] = useState<string | null>(null);
  const [quickWorkoutId, setQuickWorkoutId] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const sleepLock = useRef(false);
  const moveLock = useRef(false);
  const [taskDraft, setTaskDraft] = useState('');
  const [brief, setBrief] = useState('');

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const userId = await getCurrentUserId();
      const [preferences, moodLog, waterLog, allTasks, sleeps, meals, workouts, habitRows, logs] = await Promise.all([
        getPreferences(),
        getMoodLog(userId, new Date()),
        getWaterLog(userId, new Date()),
        getTasks(userId),
        getSleepLogs(userId),
        getNutritionLogs(userId),
        getWorkouts(userId),
        getHabits(userId),
        getHabitLogs(userId),
      ]);
      const todayKey = format(new Date(), 'yyyy-MM-dd');
      const todayMeals = meals.filter((meal) => isToday(new Date(meal.logged_at)));
      const todaySleep = sleeps.find((sleep) => isToday(new Date(sleep.created_at)));
      const todayWorkouts = workouts.filter((workout) => isToday(new Date(workout.started_at)));
      const quick = todayWorkouts.find((workout) => workout.notes === 'rapido');

      setPrefs(preferences);
      await migrateMoodScores(userId);
      const scaledMood = moodScale(moodLog?.mood_score);
      setMood(scaledMood);
      setHabits([...habitRows].reverse());
      setHabitLogs(logs);
      setTasks(
        allTasks
          .filter((task) => !task.completed && (!task.deadline || task.deadline.slice(0, 10) <= todayKey))
          .slice(0, 5),
      );
      setSleepId(todaySleep?.id ?? null);
      setQuickWorkoutId(quick?.id ?? null);
      setHasSession(todayWorkouts.some((workout) => workout.id !== quick?.id));
      setSummary({
        calories: todayMeals.reduce((acc, meal) => acc + (meal.calories ?? 0), 0),
        sleep: todaySleep ? sleepHours(todaySleep.bed_time, todaySleep.wake_time) : 0,
        workout: todayWorkouts.length > 0,
        waterMl: waterLog?.amount_ml ?? 0,
      });
      const doneHabitIds = new Set(
        logs.filter((log) => log.completed && log.log_date.slice(0, 10) === todayKey).map((log) => log.habit_id),
      );
      setBrief(
        dayBrief({
          todayKey,
          waterMl: waterLog?.amount_ml ?? 0,
          waterGoalMl: preferences.waterMl,
          sleepHours: todaySleep ? sleepHours(todaySleep.bed_time, todaySleep.wake_time) : 0,
          sleepGoalHours: preferences.sleepHours,
          moved: todayWorkouts.length > 0,
          calories: todayMeals.reduce((acc, meal) => acc + (meal.calories ?? 0), 0),
          pendingHabits: habitRows.filter((habit) => !doneHabitIds.has(habit.id)).map((habit) => habit.name),
          habitsTotal: habitRows.length,
          tasks: allTasks,
        }),
      );
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha podido cargar. Tira hacia abajo para reintentar.', kind: 'error' });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => onDayRefresh(() => void load()), [load]);

  const goals = prefs ?? { displayName: '', waterMl: 2000, calories: 2000, sleepHours: 7 };
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const completedHabitIds = useMemo(
    () => new Set(habitLogs.filter((log) => log.log_date.slice(0, 10) === todayKey && log.completed).map((log) => log.habit_id)),
    [habitLogs, todayKey],
  );
  const habitsLeft = habits.filter((habit) => !completedHabitIds.has(habit.id)).length;
  const waterDone = summary.waterMl >= goals.waterMl;
  const sleepDone = summary.sleep >= goals.sleepHours;
  const rhythm = dayRhythm({
    waterDone,
    sleepDone,
    moved: summary.workout,
    nourished: summary.calories > 0,
    habitsLeft,
    habitsTotal: habits.length,
    tasksLeft: tasks.length,
  });

  const onMoodChange = async (value: number) => {
    const previous = mood;
    setMood(value);
    try {
      await Haptics.selectionAsync();
      const userId = await getCurrentUserId();
      await upsertMoodLog(userId, { log_date: todayKey, mood_score: value, energy_score: null, notes: null });
    } catch (error) {
      console.error(error);
      setMood(previous);
      toast.show({ message: 'No se ha guardado el ánimo', kind: 'error' });
    }
  };

  const changeWater = async (delta: number) => {
    const next = Math.max(0, summary.waterMl + delta);
    setSummary((current) => ({ ...current, waterMl: next }));
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const userId = await getCurrentUserId();
      if (delta > 0) await addWater(userId, new Date(), delta);
      else await upsertWaterLog(userId, todayKey, next);
    } catch (error) {
      console.error(error);
      setSummary((current) => ({ ...current, waterMl: Math.max(0, current.waterMl - delta) }));
      toast.show({ message: 'No se ha guardado el agua', kind: 'error' });
    }
  };

  const openSleep = () => navigation.navigate('LogSleepScreen', { sleepId: sleepId ?? undefined, fromToday: true });
  const openWorkout = () => navigation.navigate('LogWorkoutScreen', { fromToday: true });
  const openMeal = () => navigation.navigate('LogMealScreen', { fromToday: true });

  const changeSleep = async (direction: 1 | -1) => {
    if (sleepLock.current) return;
    sleepLock.current = true;
    const current = summary.sleep;
    const next = current <= 0 && direction > 0 ? goals.sleepHours : Math.max(0, Math.round((current + direction * 0.5) * 2) / 2);
    const previousId = sleepId;
    setSummary((state) => ({ ...state, sleep: next }));
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const userId = await getCurrentUserId();
      if (next <= 0) {
        if (previousId) await deleteSleepLog(userId, previousId);
        setSleepId(null);
        return;
      }
      const wake = new Date();
      wake.setHours(7, 0, 0, 0);
      const bed = new Date(wake.getTime() - next * 3_600_000);
      const times = { bed_time: bed.toISOString(), wake_time: wake.toISOString() };
      if (previousId) await updateSleepLog(userId, previousId, times);
      else setSleepId((await createSleepLog(userId, { ...times, quality_rating: null, notes: null })).id);
    } catch (error) {
      console.error(error);
      setSummary((state) => ({ ...state, sleep: current }));
      setSleepId(previousId);
      toast.show({ message: 'No se ha guardado el sueño', kind: 'error' });
    } finally {
      sleepLock.current = false;
    }
  };

  const toggleMove = async () => {
    if (moveLock.current || quickWorkoutId === 'pending') return;
    if (summary.workout && !quickWorkoutId) {
      openWorkout();
      return;
    }
    moveLock.current = true;
    const previous = quickWorkoutId;
    const wasDone = summary.workout;
    setSummary((state) => ({ ...state, workout: previous ? hasSession : true }));
    setQuickWorkoutId(previous ? null : 'pending');
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const userId = await getCurrentUserId();
      if (previous) {
        await deleteWorkout(userId, previous);
        setQuickWorkoutId(null);
        return;
      }
      const created = await createWorkout(userId, { name: 'Movimiento', notes: 'rapido', completed: true, duration_minutes: null });
      setQuickWorkoutId(created.id);
    } catch (error) {
      console.error(error);
      setSummary((state) => ({ ...state, workout: wasDone }));
      setQuickWorkoutId(previous);
      toast.show({ message: 'No se ha guardado el movimiento', kind: 'error' });
    } finally {
      moveLock.current = false;
    }
  };

  const onToggleHabit = async (habit: Habit) => {
    const wasDone = completedHabitIds.has(habit.id);
    setHabitLogs((current) => {
      const rest = current.filter((log) => !(log.habit_id === habit.id && log.log_date.slice(0, 10) === todayKey));
      return [
        ...rest,
        {
          id: `local-${habit.id}`,
          habit_id: habit.id,
          user_id: '',
          log_date: todayKey,
          completed: !wasDone,
          notes: null,
        },
      ];
    });
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const userId = await getCurrentUserId();
      const saved = await toggleHabit(userId, habit.id, new Date());
      setHabitLogs((current) => [...current.filter((log) => log.id !== `local-${habit.id}` && log.id !== saved.id), saved]);
    } catch (error) {
      console.error(error);
      setHabitLogs((current) =>
        current.map((log) => (log.id === `local-${habit.id}` ? { ...log, completed: wasDone } : log)),
      );
      toast.show({ message: 'No se ha actualizado el hábito', kind: 'error' });
    }
  };

  const onToggleTask = async (task: Task) => {
    setTasks((current) => current.filter((item) => item.id !== task.id));
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const userId = await getCurrentUserId();
      await toggleTaskCompleted(userId, task);
    } catch (error) {
      console.error(error);
      setTasks((current) => [task, ...current]);
      toast.show({ message: 'No se ha actualizado la tarea', kind: 'error' });
    }
  };

  const onDeleteHabit = async (habit: Habit) => {
    const previous = habits;
    setHabits((current) => current.filter((item) => item.id !== habit.id));
    try {
      const userId = await getCurrentUserId();
      await deleteHabit(userId, habit.id);
      warning();
      toast.show({
        message: 'Hábito eliminado',
        action: {
          label: 'Deshacer',
          onPress: () => {
            void (async () => {
              try {
                const created = await createHabit(userId, {
                  name: habit.name,
                  icon: habit.icon,
                  color: habit.color,
                  frequency: habit.frequency,
                });
                setHabits((current) => [created, ...current]);
              } catch (undoError) {
                console.error(undoError);
                toast.show({ message: 'No se ha podido recuperar el hábito.', kind: 'error' });
              }
            })();
          },
        },
      });
    } catch (error) {
      console.error(error);
      setHabits(previous);
      toast.show({ message: 'No se ha podido eliminar.', kind: 'error' });
    }
  };

  const onAddTask = async () => {
    const title = taskDraft.trim();
    if (!title) return;
    setTaskDraft('');
    try {
      const userId = await getCurrentUserId();
      const created = await createTask(userId, {
        title,
        description: null,
        deadline: todayKey,
        completed: false,
        priority: 'medium',
      });
      setTasks((current) => [created, ...current].slice(0, 5));
    } catch (error) {
      console.error(error);
      setTaskDraft(title);
      toast.show({ message: 'No se ha guardado la tarea', kind: 'error' });
    }
  };

  const today = new Date();
  const dateTitle = weekdayHeading(today);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md, paddingBottom: tabClearance(insets.bottom) }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.ink} />}
    >
      <ScreenHeader
        title={dateTitle}
        subtitle={`${rhythm.done} de ${rhythm.total} hechos`}
        onSettings={() => navigation.navigate('SettingsScreen')}
      />
      {brief ? <Text style={styles.brief}>{brief}</Text> : null}

      <Card>
        <LineRow
          icon={Droplets}
          label="Agua"
          value={summary.waterMl >= 1000 ? `${(summary.waterMl / 1000).toFixed(1)} L` : `${summary.waterMl} ml`}
          hint={`de ${(goals.waterMl / 1000).toFixed(1)} L`}
          progress={goals.waterMl ? summary.waterMl / goals.waterMl : 0}
          tint={Colors.water}
          trailing={
            <View style={styles.stepper}>
              <Pressable accessibilityLabel="Quitar 250 ml" hitSlop={8} onPress={() => changeWater(-250)} style={({ pressed }) => [styles.step, pressed && styles.pressed]}>
                <Minus color={Colors.water} size={14} />
              </Pressable>
              <Pressable accessibilityLabel="Añadir 250 ml" hitSlop={8} onPress={() => changeWater(250)} style={({ pressed }) => [styles.step, pressed && styles.pressed]}>
                <Plus color={Colors.water} size={14} />
              </Pressable>
            </View>
          }
        />
        <LineRow
          icon={Moon}
          label="Sueño"
          value={summary.sleep > 0 ? `${summary.sleep} h` : 'Anotar'}
          hint={`objetivo ${goals.sleepHours} h`}
          progress={goals.sleepHours ? summary.sleep / goals.sleepHours : 0}
          tint={Colors.sleep}
          trailing={
            <View style={styles.stepper}>
              <Pressable accessibilityLabel="Quitar 30 min" hitSlop={8} onPress={() => changeSleep(-1)} style={({ pressed }) => [styles.step, pressed && styles.pressed]}>
                <Minus color={Colors.sleep} size={14} />
              </Pressable>
              <Pressable
                accessibilityLabel={summary.sleep > 0 ? 'Añadir 30 min' : `Anotar ${goals.sleepHours} h`}
                hitSlop={8}
                onPress={() => changeSleep(1)}
                style={({ pressed }) => [styles.step, pressed && styles.pressed]}
              >
                <Plus color={Colors.sleep} size={14} />
              </Pressable>
              <Pressable accessibilityLabel="Detalle del sueño" hitSlop={8} onPress={openSleep} style={({ pressed }) => pressed && styles.pressed}>
                <ChevronRight color={Colors.text3} size={18} />
              </Pressable>
            </View>
          }
        />
        <LineRow
          icon={Dumbbell}
          label="Movimiento"
          value={summary.workout ? 'Hecho' : 'Pendiente'}
          hint={summary.workout ? 'Registrado hoy' : 'Sin sesión'}
          progress={summary.workout ? 1 : 0}
          tint={Colors.workout}
          trailing={
            <View style={styles.stepper}>
              <Pressable
                accessibilityLabel={summary.workout && !quickWorkoutId ? 'Ver sesión' : summary.workout ? 'Quitar movimiento' : 'Marcar movimiento'}
                hitSlop={8}
                onPress={toggleMove}
                style={({ pressed }) => [styles.step, summary.workout ? styles.stepOn : null, pressed && styles.pressed]}
              >
                <Check color={summary.workout ? Colors.surface : Colors.workout} size={14} strokeWidth={2.6} />
              </Pressable>
              <Pressable accessibilityLabel="Detalle del entreno" hitSlop={8} onPress={openWorkout} style={({ pressed }) => pressed && styles.pressed}>
                <ChevronRight color={Colors.text3} size={18} />
              </Pressable>
            </View>
          }
        />
        <LineRow
          icon={Utensils}
          label="Comida"
          value={summary.calories > 0 ? `${summary.calories} kcal` : 'Anotar'}
          hint={summary.calories > 0 ? `de ${goals.calories}` : 'Sin registro'}
          progress={goals.calories ? summary.calories / goals.calories : 0}
          tint={Colors.food}
          onPress={openMeal}
          trailing={<ChevronRight color={Colors.text3} size={18} />}
          last
        />
      </Card>

      <Card>
        <SectionHeader title="Hábitos" action={{ label: 'Añadir', onPress: () => navigation.navigate('AddHabitModal') }} />
        {habits.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Sin hábitos"
            subtitle="Añade el primero."
            action={{ label: 'Nuevo hábito', onPress: () => navigation.navigate('AddHabitModal') }}
          />
        ) : (
          habits.map((habit) => {
            const done = completedHabitIds.has(habit.id);
            const letters = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
            const marks = Array.from({ length: 7 }, (_, index) => {
              const day = subDays(new Date(), 6 - index);
              const key = format(day, 'yyyy-MM-dd');
              return {
                letter: letters[day.getDay()],
                on: habitLogs.some((log) => log.habit_id === habit.id && log.completed && log.log_date.slice(0, 10) === key),
              };
            });
            return (
              <HabitRow
                key={habit.id}
                name={habit.name}
                icon={habit.icon}
                color={habit.color || Colors.accent}
                done={done}
                streak={habitStreak(habitLogs, habit.id)}
                marks={marks}
                onPress={() => onToggleHabit(habit)}
                onLongPress={() => onDeleteHabit(habit)}
              />
            );
          })
        )}
      </Card>

      <Card>
        <SectionHeader title="Ánimo" />
        <View style={styles.moodRow}>
          {MOODS.map(({ score, label }) => {
            const selected = mood === score;
            return (
              <Pressable
                key={score}
                accessibilityLabel={label}
                accessibilityState={{ selected }}
                onPress={() => onMoodChange(score)}
                style={({ pressed }) => [styles.moodChip, selected ? styles.moodChipOn : null, pressed ? styles.pressed : null]}
              >
                <Text style={[styles.moodNum, selected ? styles.moodNumOn : null]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <SectionHeader title="Tareas" action={{ label: 'Añadir', onPress: () => navigation.navigate('AddTaskModal', { date: todayKey }) }} />
        <TextInput
          value={taskDraft}
          onChangeText={setTaskDraft}
          onSubmitEditing={onAddTask}
          placeholder="Nueva tarea"
          placeholderTextColor={Colors.text3}
          returnKeyType="done"
          style={styles.taskInput}
        />
        {tasks.length === 0 ? (
          <Text style={styles.empty}>Nada pendiente.</Text>
        ) : (
          tasks.map((task) => (
            <CheckRow
              key={task.id}
              title={task.title}
              done={task.completed}
              emphasis={task.priority === 'high' ? 'ALTA' : undefined}
              meta={task.deadline && task.deadline.slice(0, 10) !== todayKey ? shortDay(task.deadline) : undefined}
              onPress={() => onToggleTask(task)}
            />
          ))
        )}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  stepper: { flexDirection: 'row', gap: 6 },
  step: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.fill },
  stepOn: { backgroundColor: Colors.workout },
  taskInput: {
    minHeight: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.fill,
    color: Colors.ink,
    fontFamily: Typography.fontRegular,
    fontSize: 16,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  moodRow: { flexDirection: 'row', gap: 4 },
  moodChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.fill,
    paddingHorizontal: 2,
  },
  moodChipOn: { backgroundColor: Colors.accent },
  moodNum: { fontFamily: Typography.fontMedium, fontSize: 12, color: Colors.text2, textAlign: 'center' },
  moodNumOn: { color: Colors.surface },
  empty: { fontFamily: Typography.fontRegular, fontSize: Typography.md, color: Colors.text3, lineHeight: 22 },
  pressed: { opacity: 0.78 },
  brief: {
    fontFamily: Typography.fontRegular,
    fontSize: Typography.md,
    lineHeight: 22,
    color: Colors.text2,
    marginTop: -Spacing.sm,
  },
});

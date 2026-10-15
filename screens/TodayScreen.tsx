import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '../lib/toast';
import { light, medium, selection, warning } from '../lib/haptics';
import { onDayRefresh } from '../lib/refresh';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, isToday, subDays } from 'date-fns';
import { Check, Droplets, Dumbbell, Frown, Laugh, Meh, Moon, Plus, Smile, SmilePlus, Utensils } from 'lucide-react-native';
import { CheckBox } from '../components/ui/CheckBox';
import { CheckCircle } from '../components/ui/CheckCircle';
import { Card } from '../components/ui/Card';
import { Colors } from '../constants/colors';
import { Spacing, tabClearance } from '../constants/spacing';
import { Type, tabular } from '../constants/typography';
import { getCurrentUserId } from '../services/authService';
import { createHabit, deleteHabit, getHabitLogs, getHabits, toggleHabit } from '../services/habitService';
import { getMoodLog, upsertMoodLog } from '../services/moodService';
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
import { taskTiming } from '../utils/taskMeta';
import { monthDay, weekdayName } from '../utils/labels';
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
  const [sourceTasks, setSourceTasks] = useState<Task[]>([]);

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
      const scaledMood = moodScale(moodLog?.mood_score);
      setMood(scaledMood);
      setHabits(habitRows);
      setHabitLogs(logs);
      setSourceTasks(allTasks);
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
  const brief = useMemo(
    () =>
      dayBrief({
        todayKey,
        waterMl: summary.waterMl,
        waterGoalMl: goals.waterMl,
        sleepHours: summary.sleep,
        sleepGoalHours: goals.sleepHours,
        moved: summary.workout,
        calories: summary.calories,
        pendingHabits: habits.filter((habit) => !completedHabitIds.has(habit.id)).map((habit) => habit.name),
        habitsTotal: habits.length,
        tasks: sourceTasks,
      }),
    [completedHabitIds, goals.sleepHours, goals.waterMl, habits, sourceTasks, summary, todayKey],
  );
  const waterDone = summary.waterMl >= goals.waterMl;
  const sleepDone = summary.sleep >= goals.sleepHours;

  const onMoodChange = async (value: number) => {
    const previous = mood;
    setMood(value);
    try {
      selection();
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
      light();
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
      light();
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
      light();
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
      medium();
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
    setSourceTasks((current) => current.map((item) => (item.id === task.id ? { ...item, completed: true } : item)));
    try {
      light();
      const userId = await getCurrentUserId();
      await toggleTaskCompleted(userId, task);
    } catch (error) {
      console.error(error);
      setTasks((current) => [task, ...current]);
      setSourceTasks((current) => current.map((item) => (item.id === task.id ? task : item)));
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
                setHabits((current) => [...current, created]);
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
      setSourceTasks((current) => [created, ...current]);
    } catch (error) {
      console.error(error);
      setTaskDraft(title);
      toast.show({ message: 'No se ha guardado la tarea', kind: 'error' });
    }
  };

  const today = new Date();
  const initial = (prefs?.displayName || 'L').trim().charAt(0).toUpperCase() || 'L';
  const checks = [waterDone, sleepDone, summary.workout, summary.calories > 0, ...habits.map((habit) => completedHabitIds.has(habit.id))];
  const doneCount = checks.filter(Boolean).length;
  const waterValue = (summary.waterMl / 1000).toFixed(1).replace('.', ',');
  const goalLiters = (goals.waterMl / 1000).toFixed(1).replace('.', ',');
  const sleepValue = String(summary.sleep).replace('.', ',');
  const faces = [Frown, Meh, Smile, SmilePlus, Laugh];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg, paddingBottom: tabClearance(insets.bottom) + 24 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.ink} />}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.overline}>{weekdayName(today)}</Text>
          <Text style={styles.title}>{monthDay(today)}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Ajustes y cuenta" onPress={() => navigation.navigate('SettingsScreen')} style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </Pressable>
      </View>

      <BriefLine text={brief} />
      <View style={styles.segments}>
        <View style={styles.segmentRow}>
          {checks.map((on, index) => (
            <View key={index} style={[styles.segment, on ? styles.segmentOn : null]} />
          ))}
        </View>
        <Text style={styles.segmentCount}>
          {doneCount} de {checks.length}
        </Text>
      </View>

      <View style={styles.grid}>
        <Pressable accessibilityRole="button" accessibilityLabel="Agua" onPress={() => void changeWater(250)} onLongPress={() => void changeWater(250)} style={styles.metric}>
          <View style={styles.metricLabel}>
            <Droplets color={Colors.water} size={16} />
            <Text style={styles.metricName}>Agua</Text>
          </View>
          <View style={styles.metricValueRow}>
            <Text maxFontSizeMultiplier={1.3} style={styles.metricValue}>
              {waterValue}
              <Text style={styles.metricUnit}> / {goalLiters} L</Text>
            </Text>
            <View style={styles.plus}>
              <Plus color={Colors.water} size={18} />
            </View>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(100, Math.round((summary.waterMl / Math.max(goals.waterMl, 1)) * 100))}%`, backgroundColor: Colors.water }]} />
          </View>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel="Sueño" onPress={openSleep} style={styles.metric}>
          <View style={styles.metricLabel}>
            <Moon color={Colors.sleep} size={16} />
            <Text style={styles.metricName}>Sueño</Text>
          </View>
          <View style={styles.metricValueRow}>
            <Text maxFontSizeMultiplier={1.3} style={styles.metricValue}>
              {summary.sleep > 0 ? sleepValue : '—'}
              {summary.sleep > 0 ? <Text style={styles.metricUnit}> h</Text> : null}
            </Text>
            {sleepDone ? (
              <View style={styles.doneMark}>
                <Check color={Colors.surface} size={14} strokeWidth={2.6} />
              </View>
            ) : null}
          </View>
          <View style={[styles.track, sleepDone ? { backgroundColor: Colors.sleep } : null]}>
            {sleepDone ? null : <View style={[styles.fill, { width: summary.sleep > 0 ? '70%' : '0%', backgroundColor: Colors.sleepLow }]} />}
          </View>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel={summary.workout ? 'Movimiento hecho' : 'Marcar movimiento'} onPress={toggleMove} style={styles.metric}>
          <View style={styles.metricLabel}>
            <Dumbbell color={Colors.workout} size={16} />
            <Text style={styles.metricName}>Movimiento</Text>
          </View>
          <Text style={styles.pending}>{summary.workout ? 'Hecho' : 'Pendiente'}</Text>
          <Text style={styles.metricHint}>{summary.workout ? 'Registrado hoy' : 'Toca para marcar'}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: summary.workout ? '100%' : '0%', backgroundColor: Colors.workout }]} />
          </View>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel="Comida" onPress={openMeal} style={styles.metric}>
          <View style={styles.metricLabel}>
            <Utensils color={Colors.food} size={16} />
            <Text style={styles.metricName}>Comida</Text>
          </View>
          <Text maxFontSizeMultiplier={1.3} style={styles.metricValue}>
            {summary.calories.toLocaleString('es-ES')}
            <Text style={styles.metricUnit}> / {goals.calories.toLocaleString('es-ES')} kcal</Text>
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(100, Math.round((summary.calories / Math.max(goals.calories, 1)) * 100))}%`, backgroundColor: Colors.food }]} />
          </View>
        </Pressable>
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.section}>
          Hábitos <Text style={styles.sectionMeta}>{habits.length - habitsLeft} de {habits.length}</Text>
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Añadir hábito" hitSlop={8} onPress={() => navigation.navigate('AddHabitModal')} style={styles.linkHit}>
          <Text style={styles.link}>Añadir</Text>
        </Pressable>
      </View>
      <Card inset>
        {habits.length === 0 ? <Text style={styles.empty}>Aún no hay hábitos. Añade el primero.</Text> : null}
        {habits.map((habit, index) => {
          const done = completedHabitIds.has(habit.id);
          const streak = habitStreak(habitLogs, habit.id);
          const marks = Array.from({ length: 7 }, (_, markIndex) => {
            const day = subDays(new Date(), 6 - markIndex);
            const key = format(day, 'yyyy-MM-dd');
            return habitLogs.some((log) => log.habit_id === habit.id && log.completed && log.log_date.slice(0, 10) === key);
          });
          return (
            <View key={habit.id} style={[styles.habit, index === habits.length - 1 ? styles.habitLast : null]}>
              <CheckCircle done={done} color={habit.color || Colors.accent} label={habit.name} onPress={() => onToggleHabit(habit)} />
              <Pressable accessibilityRole="button" accessibilityLabel={`Quitar ${habit.name}`} onLongPress={() => onDeleteHabit(habit)} style={styles.habitCopy}>
                <Text numberOfLines={1} style={[styles.habitName, done ? styles.habitDone : null]}>
                  {habit.name}
                </Text>
                {streak >= 2 ? <Text style={styles.streak}>{streak} días</Text> : null}
              </Pressable>
              <View style={styles.week}>
                {marks.map((on, markIndex) => (
                  <View key={markIndex} style={[styles.dot, on ? { backgroundColor: habit.color || Colors.accent } : styles.dotOff, markIndex === 6 ? styles.dotToday : null]} />
                ))}
              </View>
            </View>
          );
        })}
      </Card>

      <Text style={styles.section}>¿Cómo estás hoy?</Text>
      <Card>
        <View style={styles.moods}>
          {MOODS.map(({ score, label }, index) => {
            const Face = faces[index];
            const selected = mood === score;
            return (
              <Pressable
                key={score}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected }}
                onPress={() => onMoodChange(score)}
                style={[styles.mood, selected ? styles.moodOn : null]}
              >
                <Face color={selected ? Colors.surface : Colors.text2} size={26} />
                <Text style={[styles.moodLabel, selected ? styles.moodLabelOn : null]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <View style={styles.sectionHead}>
        <Text style={styles.section}>
          Tareas <Text style={styles.sectionMeta}>{tasks.length} hoy</Text>
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Ver plan" hitSlop={8} onPress={() => navigation.navigate('Plan')} style={styles.linkHit}>
          <Text style={styles.link}>Ver plan</Text>
        </Pressable>
      </View>
      <Card inset>
        <View style={styles.taskDraft}>
          <Plus color={Colors.text3} size={14} />
          <TextInput
            value={taskDraft}
            onChangeText={setTaskDraft}
            onSubmitEditing={onAddTask}
            placeholder="Añadir tarea para hoy"
            placeholderTextColor={Colors.text4}
            accessibilityLabel="Nueva tarea"
            returnKeyType="done"
            style={styles.taskInput}
          />
        </View>
        {tasks.length === 0 ? <Text style={styles.empty}>Nada pendiente.</Text> : null}
        {tasks.map((task) => {
          const timing = taskTiming(task.deadline, todayKey, task.priority);
          return (
            <View key={task.id} style={styles.task}>
              <CheckBox done={task.completed} label={task.title} onPress={() => onToggleTask(task)} />
              <View style={styles.taskCopy}>
                <Text numberOfLines={2} style={styles.taskTitle}>
                  {task.title}
                </Text>
                {timing ? <Text style={timing.overdue ? styles.overdue : styles.when}>{timing.text}</Text> : null}
              </View>
            </View>
          );
        })}
      </Card>
    </ScrollView>
  );
};

const BriefLine = ({ text }: { text: string }) => {
  const parts = text.split(/(«[^»]+»|\d[\d.]*|,\d+)/).filter((part) => part.length > 0);
  return (
    <Text style={styles.brief}>
      {parts.map((part, index) =>
        /^(\d|«)/.test(part) ? (
          <Text key={index} style={styles.briefStrong}>
            {part}
          </Text>
        ) : (
          <Text key={index}>{part}</Text>
        ),
      )}
    </Text>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headerCopy: { flex: 1, gap: 2 },
  overline: { ...Type.overline, color: Colors.accent },
  title: { ...Type.title, color: Colors.ink },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...Type.bodyStrong, color: Colors.surface },
  brief: { ...Type.body, color: Colors.text2, fontSize: 15, lineHeight: 22 },
  briefStrong: { ...Type.bodyStrong, color: Colors.ink, fontSize: 15, lineHeight: 22 },
  segments: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: -8 },
  segmentRow: { flex: 1, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  segmentOn: { backgroundColor: Colors.accent },
  segmentCount: { ...Type.caption, ...tabular, color: Colors.text2, fontFamily: 'Outfit_600SemiBold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: { width: '47%', flexGrow: 1, backgroundColor: Colors.surface, borderRadius: 18, padding: 14, gap: 10, minHeight: 118 },
  metricLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metricName: { ...Type.caption, color: Colors.text2, fontFamily: 'Outfit_600SemiBold' },
  metricValueRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  metricValue: { ...tabular, fontFamily: 'Outfit_600SemiBold', fontSize: 28, lineHeight: 32, letterSpacing: -0.5, color: Colors.ink },
  metricUnit: { fontFamily: 'Outfit_400Regular', fontSize: 13, lineHeight: 18, color: Colors.text3 },
  metricHint: { ...Type.caption, color: Colors.text3, marginTop: -6 },
  pending: { fontFamily: 'Outfit_600SemiBold', fontSize: 20, lineHeight: 24, letterSpacing: -0.3, color: Colors.ink },
  plus: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.waterSoft, alignItems: 'center', justifyContent: 'center' },
  doneMark: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.sleep, alignItems: 'center', justifyContent: 'center' },
  track: { height: 8, borderRadius: 99, backgroundColor: Colors.track, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 99 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { ...Type.section, color: Colors.ink },
  sectionMeta: { ...Type.caption, color: Colors.text3 },
  linkHit: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  link: { ...Type.bodyStrong, color: Colors.accent, fontSize: 15 },
  empty: { ...Type.body, color: Colors.text3, paddingVertical: 12 },
  habit: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: Colors.line },
  habitLast: { borderBottomWidth: 0 },
  habitCopy: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center' },
  habitName: { ...Type.body, color: Colors.ink },
  habitDone: { color: Colors.text3 },
  streak: { ...Type.caption, color: Colors.workout, fontFamily: 'Outfit_600SemiBold' },
  week: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOff: { backgroundColor: '#EBEEF2' },
  dotToday: { borderWidth: 1, borderColor: Colors.ink },
  moods: { flexDirection: 'row', gap: 6 },
  mood: { flex: 1, minHeight: 72, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.fill },
  moodOn: { backgroundColor: Colors.accent },
  moodLabel: { fontFamily: 'Outfit_600SemiBold', fontSize: 11, color: Colors.text2, textAlign: 'center' },
  moodLabelOn: { color: Colors.surface },
  taskDraft: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: Colors.line },
  taskInput: { flex: 1, minHeight: 44, ...Type.body, color: Colors.ink },
  task: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 },
  taskCopy: { flex: 1, gap: 2 },
  taskTitle: { ...Type.body, color: Colors.ink },
  when: { ...Type.caption, color: Colors.text2 },
  overdue: { ...Type.caption, color: Colors.danger },
});

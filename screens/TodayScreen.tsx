import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '../lib/toast';
import { light, medium, selection, success } from '../lib/haptics';
import { getStored, setStored } from '../lib/storage';
import { onDayRefresh } from '../lib/refresh';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, isToday, subDays } from 'date-fns';
import { Plus } from 'lucide-react-native';
import { MoodFace } from '../components/ui/MoodFace';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { BeaconMark } from '../components/ui/BeaconMark';
import { DelayedSkeleton, SkeletonBlock } from '../components/ui/Skeleton';
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
import { formatFlexible, formatNumber, formatWater } from '../utils/format';
import { taskTiming } from '../utils/taskMeta';
import { monthDay, weekdayName } from '../utils/labels';
import { SwipeRow } from '../components/ui/SwipeRow';
import { WeeklySummaryCard } from '../components/WeeklySummaryCard';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { habitStreak } from '../utils/streak';

let hoyEntered = false;

type Summary = { calories: number; sleep: number; workout: boolean; waterMl: number };

type TodayCache = {
  mood: number | null;
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  prefs: Preferences | null;
  summary: Summary;
  sleepId: string | null;
  quickWorkoutId: string | null;
  hasSession: boolean;
  sourceTasks: Task[];
};

let todayCache: TodayCache | null = null;

type TodayNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Today'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const sleepHours = (bed: string, wake: string) => {
  const hours = (new Date(wake).getTime() - new Date(bed).getTime()) / 3_600_000;
  if (!Number.isFinite(hours) || hours <= 0) return 0;
  return Number(Math.min(hours, 24).toFixed(1));
};

export const TodayScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<TodayNav>();
  const [refreshing, setRefreshing] = useState(false);
  const [ready, setReady] = useState(Boolean(todayCache));
  const [mood, setMood] = useState<number | null>(todayCache?.mood ?? null);
  const [tasks, setTasks] = useState<Task[]>(todayCache?.tasks ?? []);
  const [habits, setHabits] = useState<Habit[]>(todayCache?.habits ?? []);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>(todayCache?.habitLogs ?? []);
  const [prefs, setPrefs] = useState<Preferences | null>(todayCache?.prefs ?? null);
  const [summary, setSummary] = useState<Summary>(todayCache?.summary ?? { calories: 0, sleep: 0, workout: false, waterMl: 0 });
  const [sleepId, setSleepId] = useState<string | null>(todayCache?.sleepId ?? null);
  const [quickWorkoutId, setQuickWorkoutId] = useState<string | null>(todayCache?.quickWorkoutId ?? null);
  const [hasSession, setHasSession] = useState(todayCache?.hasSession ?? false);
  const sleepLock = useRef(false);
  const moveLock = useRef(false);
  const taskTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [taskDraft, setTaskDraft] = useState('');
  const [sourceTasks, setSourceTasks] = useState<Task[]>(todayCache?.sourceTasks ?? []);

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
      const visibleTasks = allTasks
        .filter((task) => !task.completed && (!task.deadline || task.deadline.slice(0, 10) <= todayKey))
        .slice(0, 5);
      const nextSummary = {
        calories: todayMeals.reduce((acc, meal) => acc + (meal.calories ?? 0), 0),
        sleep: todaySleep ? sleepHours(todaySleep.bed_time, todaySleep.wake_time) : 0,
        workout: todayWorkouts.length > 0,
        waterMl: waterLog?.amount_ml ?? 0,
      };
      const nextSession = todayWorkouts.some((workout) => workout.id !== quick?.id);
      setSleepId(todaySleep?.id ?? null);
      setQuickWorkoutId(quick?.id ?? null);
      setHasSession(nextSession);
      setTasks(visibleTasks);
      setSummary(nextSummary);
      todayCache = {
        mood: scaledMood,
        tasks: visibleTasks,
        habits: habitRows,
        habitLogs: logs,
        prefs: preferences,
        summary: nextSummary,
        sleepId: todaySleep?.id ?? null,
        quickWorkoutId: quick?.id ?? null,
        hasSession: nextSession,
        sourceTasks: allTasks,
      };
      setReady(true);
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha podido cargar. Tira hacia abajo para reintentar.', kind: 'error' });
      setReady(true);
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

  useEffect(() => {
    if (!ready || !todayCache) return;
    todayCache = { ...todayCache, mood, tasks, habits, habitLogs, prefs, summary, sleepId, quickWorkoutId, hasSession, sourceTasks };
  }, [habitLogs, habits, hasSession, mood, prefs, quickWorkoutId, ready, sleepId, sourceTasks, summary, tasks]);

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

  const onToggleTask = (task: Task) => {
    const pending = taskTimers.current[task.id];
    if (pending) {
      clearTimeout(pending);
      delete taskTimers.current[task.id];
      setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, completed: false } : item)));
      setSourceTasks((current) => current.map((item) => (item.id === task.id ? { ...item, completed: false } : item)));
      return;
    }
    setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, completed: true } : item)));
    setSourceTasks((current) => current.map((item) => (item.id === task.id ? { ...item, completed: true } : item)));
    taskTimers.current[task.id] = setTimeout(() => {
      delete taskTimers.current[task.id];
      setTasks((current) => current.filter((item) => item.id !== task.id));
      void (async () => {
        try {
          const userId = await getCurrentUserId();
          await toggleTaskCompleted(userId, task);
          toast.show({
            message: 'Tarea hecha',
            action: {
              label: 'Deshacer',
              onPress: () => {
                const undone = { ...task, completed: false };
                setTasks((current) => [undone, ...current].slice(0, 5));
                setSourceTasks((current) => current.map((item) => (item.id === task.id ? undone : item)));
                void toggleTaskCompleted(userId, { ...task, completed: true }).catch((undoError) => {
                  console.error(undoError);
                  toast.show({ message: 'No se ha podido deshacer', kind: 'error' });
                });
              },
            },
          });
        } catch (error) {
          console.error(error);
          setTasks((current) => current.map((item) => (item.id === task.id ? task : item)));
          setSourceTasks((current) => current.map((item) => (item.id === task.id ? task : item)));
          toast.show({ message: 'No se ha actualizado la tarea', kind: 'error' });
        }
      })();
    }, 600);
  };

  const onDeleteHabit = async (habit: Habit) => {
    const previous = habits;
    setHabits((current) => current.filter((item) => item.id !== habit.id));
    try {
      const userId = await getCurrentUserId();
      await deleteHabit(userId, habit.id);
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
  const reduce = useReduceMotion();
  const initial = (prefs?.displayName ?? '').trim().charAt(0).toUpperCase();
  const checks = [waterDone, sleepDone, summary.workout, summary.calories > 0, ...habits.map((habit) => completedHabitIds.has(habit.id))];
  const doneCount = checks.filter(Boolean).length;
  const barPulse = useSharedValue(1);
  const barStyle = useAnimatedStyle(() => ({ transform: [{ scale: barPulse.value }] }));
  const enter = (index: number) => (reduce || hoyEntered ? FadeInDown.duration(120) : FadeInDown.duration(220).delay(index * 40));
  const leave = reduce ? FadeOut.duration(120) : FadeOut.duration(160);
  const layout = reduce ? undefined : LinearTransition.duration(220);
  useEffect(() => {
    hoyEntered = true;
  }, []);
  useEffect(() => {
    if (checks.length === 0 || doneCount < checks.length) return;
    let alive = true;
    void (async () => {
      const flag = await getStored('lifepp_goal_pulse');
      if (!alive || flag === todayKey) return;
      await setStored('lifepp_goal_pulse', todayKey);
      success();
      if (!reduce) barPulse.value = withSequence(withTiming(1.06, { duration: 180 }), withTiming(1, { duration: 220 }));
    })();
    return () => {
      alive = false;
    };
  }, [barPulse, checks.length, doneCount, reduce, todayKey]);

  if (!ready) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + Spacing.lg, paddingHorizontal: Spacing.lg }]}>
        <DelayedSkeleton
          loading
          fallback={
            <View style={styles.skeleton}>
              <SkeletonBlock width="42%" height={14} />
              <SkeletonBlock width="58%" height={32} />
              <SkeletonBlock width="100%" height={48} />
              <SkeletonBlock width="100%" height={224} />
              <SkeletonBlock width="100%" height={160} />
            </View>
          }
        >
          {null}
        </DelayedSkeleton>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg, paddingBottom: tabClearance(insets.bottom) + 24 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.ink} />}
    >
      <Animated.View entering={enter(0)} style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.overline}>{weekdayName(today)}</Text>
          <Text style={styles.title}>{monthDay(today)}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Ajustes y cuenta" onPress={() => navigation.navigate('SettingsScreen')} style={styles.avatar}>
          {initial ? <Text style={styles.avatarText}>{initial}</Text> : <BeaconMark size={26} />}
        </Pressable>
      </Animated.View>

      <Animated.View entering={enter(1)}>
        <BriefLine text={brief} />
      </Animated.View>
      <Animated.View entering={enter(2)} style={[styles.segments, barStyle]}>
        <View style={styles.segmentRow}>
          {checks.map((_, index) => (
            <View key={index} style={[styles.segment, index < doneCount ? styles.segmentOn : null]} />
          ))}
        </View>
        <Text style={styles.segmentCount}>
          {formatNumber(doneCount)} de {formatNumber(checks.length)}
        </Text>
      </Animated.View>

      <WeeklySummaryCard onOpen={() => navigation.navigate('Stats')} />

      <Animated.View entering={enter(3)} style={styles.board}>
        <Pressable accessibilityRole="button" accessibilityLabel="Agua" onPress={() => void changeWater(250)} onLongPress={() => void changeWater(250)} style={styles.cell}>
          <View style={styles.metricLabel}>
            <View style={[styles.catDot, { backgroundColor: Colors.water }]} />
            <Text style={styles.metricName}>Agua</Text>
            <View style={styles.pill}>
              <Text style={styles.pillText}>+250</Text>
            </View>
          </View>
          <View style={styles.valueRow}>
            <AnimatedNumber value={summary.waterMl} kind="water" style={styles.figure} />
            <Text numberOfLines={1} style={styles.unit}>
              {' / '}
              {formatWater(goals.waterMl)}
            </Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(100, Math.round((summary.waterMl / Math.max(goals.waterMl, 1)) * 100))}%`, backgroundColor: Colors.water }]} />
          </View>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel="Sueño" onPress={openSleep} style={[styles.cell, styles.cellEdge]}>
          <View style={styles.metricLabel}>
            <View style={[styles.catDot, { backgroundColor: Colors.sleep }]} />
            <Text style={styles.metricName}>Sueño</Text>
          </View>
          {summary.sleep > 0 ? (
            <View style={styles.valueLine}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.3} style={styles.figure}>
                {formatFlexible(summary.sleep, 1)}
              </Text>
              <Text numberOfLines={1} style={styles.unit}>
                {' h'}
              </Text>
            </View>
          ) : (
            <View style={styles.copy}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.stateTitle}>
                Sin registrar
              </Text>
              <Text style={styles.caption}>Toca para añadir</Text>
            </View>
          )}
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.min(100, Math.round((summary.sleep / Math.max(goals.sleepHours, 1)) * 100))}%`,
                  backgroundColor: sleepDone ? Colors.sleep : Colors.sleepLow,
                },
              ]}
            />
          </View>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel={summary.workout ? 'Movimiento hecho' : 'Marcar movimiento'} onPress={toggleMove} style={[styles.cell, styles.cellBottom]}>
          <View style={styles.metricLabel}>
            <View style={[styles.catDot, { backgroundColor: Colors.workout }]} />
            <Text style={styles.metricName}>Movimiento</Text>
          </View>
          <View style={styles.copy}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.stateTitle}>
              {summary.workout ? 'Hecho' : 'Sin marcar'}
            </Text>
            <Text style={styles.caption}>{summary.workout ? 'Registrado hoy' : 'Toca si te has movido'}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: summary.workout ? '100%' : '0%', backgroundColor: Colors.workout }]} />
          </View>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel="Comida" onPress={openMeal} style={[styles.cell, styles.cellEdge, styles.cellBottom]}>
          <View style={styles.metricLabel}>
            <View style={[styles.catDot, { backgroundColor: Colors.food }]} />
            <Text style={styles.metricName}>Comida</Text>
          </View>
          <View style={styles.valueLine}>
            <AnimatedNumber value={summary.calories} kind="kcal" style={styles.figure} />
            <Text numberOfLines={1} style={styles.unit}>
              {' / '}
              {formatNumber(goals.calories)} kcal
            </Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(100, Math.round((summary.calories / Math.max(goals.calories, 1)) * 100))}%`, backgroundColor: Colors.food }]} />
          </View>
        </Pressable>
      </Animated.View>

      <Animated.View entering={enter(4)} style={styles.sectionHead}>
        <Text style={styles.section}>
          Hábitos <Text style={styles.sectionMeta}>{formatNumber(habits.length - habitsLeft)} de {formatNumber(habits.length)}</Text>
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Añadir hábito" hitSlop={8} onPress={() => navigation.navigate('AddHabitModal')} style={styles.linkHit}>
          <Text style={styles.link}>Añadir</Text>
        </Pressable>
      </Animated.View>
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
            <Animated.View key={habit.id} entering={enter(5)} exiting={leave} layout={layout}>
              <SwipeRow label={`Eliminar ${habit.name}`} onDelete={() => void onDeleteHabit(habit)}>
                <View style={[styles.habit, index === habits.length - 1 ? styles.habitLast : null]}>
                  <CheckCircle done={done} color={habit.color || Colors.accent} label={habit.name} onPress={() => onToggleHabit(habit)} />
                  <View style={styles.habitCopy}>
                    <Text numberOfLines={1} style={styles.habitName}>
                      {habit.name}
                    </Text>
                    <Text style={styles.habitMeta}>
                      {streak >= 2 ? `Racha de ${formatNumber(streak)} días` : done ? 'Hecho hoy' : 'Hoy pendiente'}
                    </Text>
                  </View>
                  <View style={styles.week}>
                    {marks.map((on, markIndex) => (
                      <View key={markIndex} style={[styles.dot, on ? { backgroundColor: habit.color || Colors.accent } : styles.dotOff, markIndex === 6 ? styles.dotToday : null]} />
                    ))}
                  </View>
                </View>
              </SwipeRow>
            </Animated.View>
          );
        })}
      </Card>

      <Animated.View entering={enter(6)}>
        <Text style={styles.section}>¿Cómo estás hoy?</Text>
      </Animated.View>
      <Card>
        <View style={styles.moods}>
          {MOODS.map(({ score, label }, index) => {
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
                <MoodFace index={index} color={selected ? Colors.surface : Colors.text2} size={26} />
                <Text style={[styles.moodLabel, selected ? styles.moodLabelOn : null]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Animated.View entering={enter(7)} style={styles.sectionHead}>
        <Text style={styles.section}>
          Tareas <Text style={styles.sectionMeta}>{formatNumber(tasks.length)} hoy</Text>
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Ver plan" hitSlop={8} onPress={() => navigation.navigate('Plan')} style={styles.linkHit}>
          <Text style={styles.link}>Ver plan</Text>
        </Pressable>
      </Animated.View>
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
            <Animated.View key={task.id} entering={enter(8)} exiting={leave} layout={layout} style={styles.task}>
              <CheckBox done={task.completed} label={task.title} onPress={() => onToggleTask(task)} />
              <View style={styles.taskCopy}>
                <Text numberOfLines={2} style={[styles.taskTitle, task.completed ? styles.taskDone : null]}>
                  {task.title}
                </Text>
                {timing ? <Text style={timing.overdue ? styles.overdue : styles.when}>{timing.text}</Text> : null}
              </View>
            </Animated.View>
          );
        })}
      </Card>
    </ScrollView>
  );
};

const BriefLine = ({ text }: { text: string }) => {
  const parts = text.split(/(«[^»]+»|\d{1,3}(?:\.\d{3})*(?:,\d+)?(?:\s(?:ml|L|h|kcal|min)\b(?![A-Za-zÁÉÍÓÚÜÑáéíóúüñ]))?)/).filter((part) => part.length > 0);
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
  overline: { ...Type.overline, color: Colors.text3 },
  title: { ...Type.title, color: Colors.ink },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...Type.bodyStrong, color: Colors.surface },
  brief: { ...Type.body, color: Colors.text2, fontSize: 15, lineHeight: 22 },
  briefStrong: { ...Type.bodyStrong, color: Colors.ink, fontSize: 15, lineHeight: 22 },
  segments: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: -8 },
  segmentRow: { flex: 1, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  segmentOn: { backgroundColor: Colors.ink },
  segmentCount: { ...Type.caption, ...tabular, color: Colors.text2, fontFamily: 'Outfit_600SemiBold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  board: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: Colors.surface, borderRadius: 18, overflow: 'hidden' },
  skeleton: { gap: 16 },
  cell: {
    width: '50%',
    padding: 16,
    gap: 8,
    minHeight: 112,
    justifyContent: 'flex-start',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  cellEdge: { borderRightWidth: 0 },
  cellBottom: { borderBottomWidth: 0 },
  metric: { width: '47%', flexGrow: 1, backgroundColor: Colors.surface, borderRadius: 18, padding: 14, gap: 10, minHeight: 118 },
  metricLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  metricName: { ...Type.label, color: Colors.text2 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'nowrap', gap: 4 },
  valueLine: { minWidth: 0, flexDirection: 'row', alignItems: 'baseline', flexWrap: 'nowrap', gap: 4 },
  figure: { ...tabular, flexShrink: 1, minWidth: 0, fontFamily: 'Outfit_600SemiBold', fontSize: 30, lineHeight: 32, letterSpacing: -0.8, color: Colors.ink },
  unit: { flexShrink: 0, fontFamily: 'Outfit_500Medium', fontSize: 13, lineHeight: 18, color: Colors.text3 },
  copy: { gap: 4 },
  stateTitle: { fontFamily: 'Outfit_600SemiBold', fontSize: 20, lineHeight: 26, letterSpacing: -0.3, color: Colors.ink },
  caption: { fontFamily: 'Outfit_400Regular', fontSize: 13, lineHeight: 18, color: Colors.text3 },
  pill: { marginLeft: 'auto', alignSelf: 'center', height: 24, minWidth: 40, paddingHorizontal: 8, marginVertical: -4, borderRadius: 12, backgroundColor: Colors.waterSoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  pillText: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: Colors.water },
  track: { height: 3, borderRadius: 99, backgroundColor: Colors.track, overflow: 'hidden', marginTop: 'auto' },
  fill: { height: 3, borderRadius: 99 },
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
  habitMeta: { ...Type.caption, color: Colors.text3 },
  week: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOff: { backgroundColor: '#EBEEF2' },
  dotToday: { borderWidth: 1, borderColor: Colors.ink },
  moods: { flexDirection: 'row', gap: 6 },
  mood: { flex: 1, minHeight: 72, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.fill },
  moodOn: { backgroundColor: Colors.ink },
  moodLabel: { fontFamily: 'Outfit_600SemiBold', fontSize: 11, color: Colors.text2, textAlign: 'center' },
  moodLabelOn: { color: Colors.surface },
  taskDraft: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: Colors.line },
  taskInput: { flex: 1, minHeight: 44, ...Type.body, color: Colors.ink },
  task: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 },
  taskCopy: { flex: 1, gap: 2 },
  taskTitle: { ...Type.body, color: Colors.ink },
  taskDone: { color: Colors.text4, textDecorationLine: 'line-through' },
  when: { ...Type.caption, color: Colors.text2 },
  overdue: { ...Type.caption, color: Colors.danger },
});

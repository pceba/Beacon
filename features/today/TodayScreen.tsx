import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Spacing, tabClearance } from '../../constants/spacing';
import { MainTabParamList, RootStackParamList } from '../../types/navigation';
import { DayBoard } from './components/DayBoard';
import { HabitsSection } from './components/HabitsSection';
import { MoodSection } from './components/MoodSection';
import { TasksSection } from './components/TasksSection';
import { TodayHeader } from './components/TodayHeader';
import { TodaySkeleton } from './components/TodaySkeleton';
import { WeeklySummaryCard } from './components/WeeklySummaryCard';
import { useEntrance } from './hooks/useEntrance';
import { useTodayActions } from './hooks/useTodayActions';
import { useTodayData } from './hooks/useTodayData';

type TodayNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Today'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export const TodayScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<TodayNav>();
  const data = useTodayData();
  const { todayKey, sleepId, refetchAll } = data;
  const motion = useEntrance(data.cached, data.ready);
  const [refreshing, setRefreshing] = useState(false);

  const openWorkout = useCallback(() => navigation.navigate('LogWorkoutScreen', { fromToday: true }), [navigation]);
  const openSleep = useCallback(
    () => navigation.navigate('LogSleepScreen', { sleepId: sleepId ?? undefined, fromToday: true }),
    [navigation, sleepId],
  );
  const openMeal = useCallback(() => navigation.navigate('LogMealScreen', { fromToday: true }), [navigation]);
  const openSettings = useCallback(() => navigation.navigate('SettingsScreen'), [navigation]);
  const openAddHabit = useCallback(() => navigation.navigate('AddHabitModal'), [navigation]);
  const openPlan = useCallback(() => navigation.navigate('Plan'), [navigation]);
  const openStats = useCallback(() => navigation.navigate('Stats'), [navigation]);

  const actions = useTodayActions(todayKey, openWorkout);
  const runMove = actions.toggleMove;
  const toggleMove = useCallback(() => void runMove(), [runMove]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
  }, [refetchAll]);

  const contentStyle = useMemo(
    () => [styles.content, { paddingTop: insets.top + Spacing.lg, paddingBottom: tabClearance(insets.bottom) + 24 }],
    [insets.bottom, insets.top],
  );

  if (!data.ready) return <TodaySkeleton top={insets.top} />;

  const initial = data.prefs.displayName.trim().charAt(0).toUpperCase();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={contentStyle}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={Colors.ink} />}
    >
      <TodayHeader
        todayKey={todayKey}
        initial={initial}
        brief={data.brief}
        doneCount={data.doneCount}
        checkCount={data.checkCount}
        reduce={motion.reduce}
        enter={motion.enter}
        onOpenSettings={openSettings}
      />
      <WeeklySummaryCard todayKey={todayKey} onOpen={openStats} />
      <DayBoard
        waterMl={data.waterMl}
        waterGoal={data.prefs.waterMl}
        sleep={data.sleep}
        sleepGoal={data.prefs.sleepHours}
        moved={data.moved}
        calories={data.calories}
        caloriesGoal={data.prefs.calories}
        enter={motion.enter}
        onWater={actions.changeWater}
        onSleep={openSleep}
        onMove={toggleMove}
        onMeal={openMeal}
      />
      <HabitsSection
        items={data.habitItems}
        doneCount={data.habitsDone}
        motion={motion}
        onAdd={openAddHabit}
        onToggle={actions.onToggleHabit}
        onDelete={actions.onDeleteHabit}
      />
      <MoodSection mood={data.mood} enter={motion.enter} onChange={actions.onMoodChange} />
      <TasksSection
        tasks={data.tasks}
        todayKey={todayKey}
        motion={motion}
        onOpenPlan={openPlan}
        onToggle={actions.onToggleTask}
        onAdd={actions.addTask}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
});

import React, { useCallback, useState } from 'react';
import { toast } from '../lib/toast';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionHeader } from '../components/SectionHeader';
import { Segmented } from '../components/Segmented';
import { Colors } from '../constants/colors';
import { Spacing, tabClearance } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { getCurrentUserId } from '../services/authService';
import { getBodyStats, getHabitStats, getNutritionStats, getSleepStats, getWorkoutStats } from '../services/statsService';
import { BodyStats, HabitStats, NutritionStats, SleepStats, WorkoutStats } from '../types/stats';

const periodMap: Record<'week' | 'month' | 'quarter', number> = { week: 7, month: 30, quarter: 90 };

const NoData = ({ label }: { label: string }) => (
  <View style={styles.noData}>
    <Text style={styles.noDataText}>Sin datos de {label}</Text>
  </View>
);

export const StatsScreen = () => {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('week');
  const [refreshing, setRefreshing] = useState(false);
  const [sleep, setSleep] = useState<SleepStats>({ averageHours: 0, bestHours: 0, points: [] });
  const [nutrition, setNutrition] = useState<NutritionStats>({ averageCalories: 0, averageProtein: 0, caloriesByDay: [], macros: [] });
  const [workouts, setWorkouts] = useState<WorkoutStats>({ sessions: 0, totalVolume: 0, sessionsByWeek: [] });
  const [habits, setHabits] = useState<HabitStats>({ completionRate: 0, streakHeatmap: [] });
  const [body, setBody] = useState<BodyStats>({ latestWeight: null, changeFromStart: 0, points: [] });

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const userId = await getCurrentUserId();
      const days = periodMap[period];
      const [sleepStats, nutritionStats, workoutStats, habitStats, bodyStats] = await Promise.all([
        getSleepStats(userId, days),
        getNutritionStats(userId, days),
        getWorkoutStats(userId, days),
        getHabitStats(userId, days),
        getBodyStats(userId),
      ]);
      setSleep(sleepStats);
      setNutrition(nutritionStats);
      setWorkouts(workoutStats);
      setHabits(habitStats);
      setBody(bodyStats);
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se han podido cargar los datos', kind: 'error' });
    } finally {
      setRefreshing(false);
    }
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Guard macros: PieChart requires at least one positive value
  const validMacros = nutrition.macros.filter((m) => m.value > 0);
  const safeMacros = validMacros.length > 0 ? validMacros : null;

  return (
    <ScrollView
      style={{ backgroundColor: Colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingHorizontal: Spacing.lg, paddingBottom: tabClearance(insets.bottom), gap: Spacing.lg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
    >
      <ScreenHeader title="Datos" />
      <Segmented
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'week', label: 'Semana' },
          { value: 'month', label: 'Mes' },
          { value: 'quarter', label: 'Trimestre' },
        ]}
      />

      {/* ── Sleep ── */}
      <Card>
        <SectionHeader title="Sueño" />
        {sleep.points.length > 0 ? (
          <Text style={styles.body}>
            Media {sleep.averageHours} h · Mejor {sleep.bestHours} h
          </Text>
        ) : null}
        {sleep.points.length > 1 ? (
          <LineChart
            data={sleep.points}
            color={Colors.sleep}
            hideDataPoints
            noOfSections={3}
            yAxisTextStyle={{ color: Colors.text3, fontFamily: Typography.fontRegular, fontSize: Typography.xs }}
            xAxisLabelTextStyle={{ color: Colors.text3, fontFamily: Typography.fontRegular, fontSize: Typography.xs }}
            areaChart
            startFillColor={Colors.sleep}
            startOpacity={0.15}
            endOpacity={0}
            initialSpacing={10}
          />
        ) : sleep.points.length === 0 ? (
          <NoData label="sueño" />
        ) : null}
      </Card>

      {/* ── Nutrition ── */}
      <Card>
        <SectionHeader title="Comida" />
        {nutrition.caloriesByDay.length > 0 ? (
          <Text style={styles.body}>
            Media {nutrition.averageCalories} kcal · Proteína {nutrition.averageProtein} g
          </Text>
        ) : null}
        {nutrition.caloriesByDay.length > 0 ? (
          <BarChart
            data={nutrition.caloriesByDay}
            frontColor={Colors.food}
            noOfSections={4}
            yAxisTextStyle={{ color: Colors.text3, fontFamily: Typography.fontRegular, fontSize: Typography.xs }}
            xAxisLabelTextStyle={{ color: Colors.text3, fontFamily: Typography.fontRegular, fontSize: Typography.xs }}
            barBorderRadius={4}
            initialSpacing={10}
          />
        ) : (
          <NoData label="comida" />
        )}
        {safeMacros ? (
          <View style={styles.macroWrap}>
            <Text style={styles.macroTitle}>Macros</Text>
            <PieChart data={safeMacros} radius={60} donut innerRadius={35} />
            <View style={styles.macroLegend}>
              {safeMacros.map((m) => (
                <View key={m.label} style={styles.macroItem}>
                  <View style={[styles.macroColor, { backgroundColor: m.color }]} />
                  <Text style={styles.macroLabel}>{m.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </Card>

      {/* ── Workouts ── */}
      <Card>
        <SectionHeader title="Entreno" />
        {workouts.sessions > 0 ? (
          <Text style={styles.body}>
            {workouts.sessions} sesiones · {workouts.totalVolume} min
          </Text>
        ) : null}
        {workouts.sessionsByWeek.length > 0 ? (
          <BarChart
            data={workouts.sessionsByWeek}
            frontColor={Colors.workout}
            yAxisTextStyle={{ color: Colors.text3, fontFamily: Typography.fontRegular, fontSize: Typography.xs }}
            xAxisLabelTextStyle={{ color: Colors.text3, fontFamily: Typography.fontRegular, fontSize: Typography.xs }}
            barBorderRadius={4}
            initialSpacing={10}
          />
        ) : workouts.sessions === 0 ? (
          <NoData label="entreno" />
        ) : null}
      </Card>

      {/* ── Habits ── */}
      <Card>
        <SectionHeader title="Hábitos" />
        <Text style={styles.body}>Completados: {habits.completionRate}%</Text>
        <View style={styles.habitTrack}>
          <View style={[styles.habitFill, { width: `${Math.min(Math.max(habits.completionRate, 0), 100)}%` }]} />
        </View>
      </Card>

      {/* ── Body ── */}
      <Card>
        <SectionHeader title="Cuerpo" />
        {body.latestWeight != null ? (
          <Text style={styles.body}>
            Peso {body.latestWeight} kg ({body.changeFromStart > 0 ? '+' : ''}
            {body.changeFromStart} kg)
          </Text>
        ) : null}
        {body.points.length > 1 ? (
          <LineChart
            data={body.points}
            color={Colors.mood}
            noOfSections={4}
            yAxisTextStyle={{ color: Colors.text3, fontFamily: Typography.fontRegular, fontSize: Typography.xs }}
            xAxisLabelTextStyle={{ color: Colors.text3, fontFamily: Typography.fontRegular, fontSize: Typography.xs }}
            areaChart
            startFillColor={Colors.mood}
            startOpacity={0.15}
            endOpacity={0}
            initialSpacing={10}
          />
        ) : body.latestWeight == null ? (
          <NoData label="peso" />
        ) : null}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  title: { color: Colors.ink, fontFamily: Typography.fontBold, fontSize: Typography.xl },
  periodRow: { flexDirection: 'row', gap: Spacing.sm },
  period: {
    backgroundColor: Colors.fill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    color: Colors.ink,
    fontFamily: Typography.fontRegular,
    fontSize: Typography.sm,
  },
  periodActive: { backgroundColor: Colors.ink, color: Colors.surface, borderColor: Colors.ink },
  body: { color: Colors.text2, fontFamily: Typography.fontRegular, fontSize: Typography.md, marginBottom: Spacing.sm },
  noData: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    backgroundColor: Colors.fill,
    borderRadius: 8,
    marginTop: Spacing.sm,
  },
  noDataText: {
    color: Colors.text3,
    fontFamily: Typography.fontRegular,
    fontSize: Typography.sm,
  },
  macroWrap: { marginTop: Spacing.md, alignItems: 'center', gap: Spacing.sm },
  macroTitle: { color: Colors.text2, fontFamily: Typography.fontMedium, fontSize: Typography.sm },
  macroLegend: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  macroItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  macroColor: { width: 10, height: 10, borderRadius: 5 },
  macroLabel: { color: Colors.text2, fontFamily: Typography.fontRegular, fontSize: Typography.sm },
  habitTrack: { height: 8, borderRadius: 99, backgroundColor: Colors.fill, overflow: 'hidden' },
  habitFill: { height: 8, borderRadius: 99, backgroundColor: Colors.accent },
});

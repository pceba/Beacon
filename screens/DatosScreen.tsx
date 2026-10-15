import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { Card } from '../components/ui/Card';
import { DeltaPill } from '../components/ui/DeltaPill';
import { InlineError } from '../components/ui/InlineError';
import { Segmented } from '../components/ui/Segmented';
import { Colors } from '../constants/colors';
import { Spacing, tabClearance } from '../constants/spacing';
import { Type, tabular } from '../constants/typography';
import { getCurrentUserId } from '../services/authService';
import { getBodyMetrics } from '../services/bodyMetricsService';
import { getHabitLogs, getHabits } from '../services/habitService';
import { getNutritionLogs } from '../services/nutritionService';
import { getPreferences } from '../services/preferencesService';
import { getSleepLogs } from '../services/sleepService';
import { getWaterLogs } from '../services/waterService';
import { getWorkouts } from '../services/workoutService';
import { formatHours, formatLiters, formatNumber } from '../utils/format';

type Period = '7' | '30' | '90';

type Point = { label: string; hours: number };

const dayKey = (date: Date) => format(date, 'yyyy-MM-dd');

const hoursBetween = (bed: string, wake: string) => {
  const hours = (new Date(wake).getTime() - new Date(bed).getTime()) / 3_600_000;
  if (!Number.isFinite(hours) || hours <= 0) return 0;
  return Math.min(hours, 24);
};

const inRange = (key: string, start: string, end: string) => key >= start && key <= end;

export const DatosScreen = () => {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>('7');
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sleepGoal, setSleepGoal] = useState(7);
  const [kpis, setKpis] = useState<Array<{ label: string; value: string; unit: string; delta: number; deltaLabel: string }>>([]);
  const [sleepBars, setSleepBars] = useState<Point[]>([]);
  const [habitRows, setHabitRows] = useState<Array<{ name: string; color: string; cells: boolean[] }>>([]);
  const [habitRate, setHabitRate] = useState(0);
  const [weight, setWeight] = useState<{ value: number | null; delta: number | null; points: number[] }>({ value: null, delta: null, points: [] });

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setFailed(false);
    try {
      const userId = await getCurrentUserId();
      const days = Number(period);
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - (days - 1));
      const prevEnd = new Date(start);
      prevEnd.setDate(start.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevEnd.getDate() - (days - 1));
      const startKey = dayKey(start);
      const endKey = dayKey(end);
      const prevStartKey = dayKey(prevStart);
      const prevEndKey = dayKey(prevEnd);

      const [prefs, sleeps, waters, meals, workouts, habits, logs, metrics] = await Promise.all([
        getPreferences(),
        getSleepLogs(userId),
        getWaterLogs(userId),
        getNutritionLogs(userId),
        getWorkouts(userId),
        getHabits(userId),
        getHabitLogs(userId),
        getBodyMetrics(userId),
      ]);
      setSleepGoal(prefs.sleepHours);

      const sleepOf = (from: string, to: string) =>
        sleeps
          .map((row) => ({ key: row.created_at.slice(0, 10), hours: hoursBetween(row.bed_time, row.wake_time) }))
          .filter((row) => inRange(row.key, from, to) && row.hours > 0);
      const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
      const currentSleep = sleepOf(startKey, endKey);
      const previousSleep = sleepOf(prevStartKey, prevEndKey);
      const sleepAvg = avg(currentSleep.map((row) => row.hours));
      const sleepDelta = sleepAvg - avg(previousSleep.map((row) => row.hours));

      const waterOf = (from: string, to: string) => waters.filter((row) => inRange(row.log_date.slice(0, 10), from, to));
      const waterAvg = (rows: typeof waters) => (rows.length ? rows.reduce((sum, row) => sum + row.amount_ml, 0) / days : 0);
      const waterNow = waterAvg(waterOf(startKey, endKey));
      const waterDelta = waterNow - waterAvg(waterOf(prevStartKey, prevEndKey));

      const workoutOf = (from: string, to: string) =>
        workouts.filter((row) => inRange(row.started_at.slice(0, 10), from, to) && row.completed);
      const workoutNow = workoutOf(startKey, endKey).length;
      const workoutDelta = workoutNow - workoutOf(prevStartKey, prevEndKey).length;

      const mealsOf = (from: string, to: string) => meals.filter((row) => inRange(row.logged_at.slice(0, 10), from, to));
      const calorieAvg = (rows: typeof meals) => {
        const total = rows.reduce((sum, row) => sum + row.calories, 0);
        return days ? total / days : 0;
      };
      const caloriesNow = calorieAvg(mealsOf(startKey, endKey));
      const calorieDelta = caloriesNow - calorieAvg(mealsOf(prevStartKey, prevEndKey));

      setKpis([
        { label: 'Sueño medio', value: formatNumber(sleepAvg, 1), unit: 'h', delta: sleepDelta, deltaLabel: `${formatNumber(Math.abs(sleepDelta), 1)} h` },
        { label: 'Agua al día', value: formatNumber(waterNow / 1000, 1), unit: 'L', delta: waterDelta, deltaLabel: formatLiters(Math.abs(waterDelta)) },
        { label: 'Entrenos', value: String(workoutNow), unit: '', delta: workoutDelta, deltaLabel: String(Math.abs(workoutDelta)) },
        { label: 'Calorías', value: formatNumber(caloriesNow, 0), unit: 'kcal', delta: calorieDelta, deltaLabel: formatNumber(Math.abs(calorieDelta), 0) },
      ]);

      const bars: Point[] = [];
      const chartDays = days === 7 ? 7 : days === 30 ? 7 : 12;
      for (let index = chartDays - 1; index >= 0; index -= 1) {
        const date = new Date(end);
        if (days === 90) date.setDate(end.getDate() - index * 7);
        else date.setDate(end.getDate() - (chartDays - 1 - index));
        const key = dayKey(date);
        const match = currentSleep.find((row) => row.key === key);
        bars.push({ label: formatNumber(match?.hours ?? 0, match ? 1 : 0), hours: match?.hours ?? 0 });
      }
      setSleepBars(bars);

      const habitDays = Array.from({ length: Math.min(days, 7) }, (_, index) => {
        const date = new Date(end);
        date.setDate(end.getDate() - (Math.min(days, 7) - 1 - index));
        return dayKey(date);
      });
      const rows = habits.map((habit) => ({
        name: habit.name,
        color: habit.color || Colors.accent,
        cells: habitDays.map((key) => logs.some((log) => log.habit_id === habit.id && log.completed && log.log_date.slice(0, 10) === key)),
      }));
      const possible = rows.length * habitDays.length;
      const hit = rows.reduce((sum, row) => sum + row.cells.filter(Boolean).length, 0);
      setHabitRows(rows);
      setHabitRate(possible ? Math.round((hit / possible) * 100) : 0);

      const weights = metrics
        .filter((row) => row.weight_kg != null && inRange(row.date.slice(0, 10), startKey, endKey))
        .sort((a, b) => a.date.localeCompare(b.date));
      const latest = metrics.find((row) => row.weight_kg != null);
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      const older = metrics
        .filter((row) => row.weight_kg != null && row.date.slice(0, 10) <= dayKey(monthAgo))
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      setWeight({
        value: latest?.weight_kg ?? null,
        delta: latest?.weight_kg != null && older?.weight_kg != null ? latest.weight_kg - older.weight_kg : null,
        points: weights.map((row) => row.weight_kg ?? 0),
      });
    } catch (error) {
      console.error(error);
      setFailed(true);
    } finally {
      setRefreshing(false);
    }
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const maxHours = Math.max(10, ...sleepBars.map((bar) => bar.hours), sleepGoal);
  const spark = weight.points.length > 1 ? weight.points : [];
  const minW = spark.length ? Math.min(...spark) : 0;
  const maxW = spark.length ? Math.max(...spark) : 1;
  const sparkPoints = spark
    .map((value, index) => {
      const x = (index / Math.max(spark.length - 1, 1)) * 320;
      const y = 60 - ((value - minW) / Math.max(maxW - minW, 0.1)) * 48;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg, paddingBottom: tabClearance(insets.bottom) + 24 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.ink} />}
    >
      <Text style={styles.title}>Datos</Text>
      <Segmented
        value={period}
        options={[
          { value: '7', label: 'Semana' },
          { value: '30', label: 'Mes' },
          { value: '90', label: '3 meses' },
        ]}
        onChange={setPeriod}
      />
      {failed ? <InlineError title="No se han podido cargar los datos" body="Tira hacia abajo o inténtalo otra vez." onRetry={() => void load(true)} /> : null}

      <View style={styles.grid}>
        {kpis.map((kpi) => (
          <Card key={kpi.label} style={styles.kpi}>
            <Text style={styles.kpiLabel}>{kpi.label}</Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.kpiValue}>
              {kpi.value}
              {kpi.unit ? <Text style={styles.unit}> {kpi.unit}</Text> : null}
            </Text>
            <DeltaPill delta={kpi.delta} label={kpi.deltaLabel} />
          </Card>
        ))}
      </View>

      <Card>
        <View style={styles.sectionHead}>
          <Text style={styles.section}>Sueño</Text>
          <Text style={styles.meta}>objetivo {formatHours(sleepGoal)}</Text>
        </View>
        <Svg width="100%" height={150} viewBox="0 0 280 150">
          <Line
            x1="0"
            x2="280"
            y1={140 - (sleepGoal / maxHours) * 110}
            y2={140 - (sleepGoal / maxHours) * 110}
            stroke={Colors.text4}
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />
          {sleepBars.map((bar, index) => {
            const slot = 280 / Math.max(sleepBars.length, 1);
            const height = (bar.hours / maxHours) * 110;
            const x = index * slot + slot * 0.25;
            return (
              <React.Fragment key={index}>
                <Line
                  x1={x}
                  x2={x + slot * 0.5}
                  y1={140 - height}
                  y2={140}
                  stroke={bar.hours >= sleepGoal ? Colors.sleep : Colors.sleepLow}
                  strokeWidth={Math.max(8, slot * 0.45)}
                  strokeLinecap="round"
                />
              </React.Fragment>
            );
          })}
        </Svg>
        <View style={styles.barLabels}>
          {sleepBars.map((bar, index) => (
            <Text key={index} style={styles.barLabel}>
              {bar.hours > 0 ? bar.label : ''}
            </Text>
          ))}
        </View>
      </Card>

      <Card>
        <View style={styles.sectionHead}>
          <Text style={styles.section}>Hábitos</Text>
          <Text style={styles.meta}>{habitRate} % cumplidos</Text>
        </View>
        {habitRows.length === 0 ? <Text style={styles.empty}>Aún no hay hábitos.</Text> : null}
        {habitRows.map((row) => (
          <View key={row.name} style={styles.habit}>
            <Text numberOfLines={1} style={styles.habitName}>
              {row.name}
            </Text>
            {row.cells.map((on, index) => (
              <View key={index} style={[styles.cell, { backgroundColor: on ? row.color : '#EBEEF2' }]} />
            ))}
          </View>
        ))}
      </Card>

      <Card>
        <View style={styles.sectionHead}>
          <Text style={styles.section}>Peso</Text>
          {weight.delta != null ? (
            <Text style={[styles.meta, { color: weight.delta <= 0 ? Colors.success : Colors.danger }]}>
              {weight.delta > 0 ? '+' : '−'}
              {formatNumber(Math.abs(weight.delta), 1)} kg en 30 días
            </Text>
          ) : null}
        </View>
        <Text maxFontSizeMultiplier={1.3} style={styles.kpiValue}>
          {weight.value != null ? formatNumber(weight.value, 1) : '—'}
          <Text style={styles.unit}> kg</Text>
        </Text>
        {spark.length > 1 ? (
          <Svg width="100%" height={70} viewBox="0 0 320 70" accessibilityLabel="Tendencia del peso">
            <Polyline points={sparkPoints} fill="none" stroke={Colors.text2} strokeWidth="2.5" strokeLinecap="round" />
            <Circle
              cx="320"
              cy={60 - ((spark[spark.length - 1] - minW) / Math.max(maxW - minW, 0.1)) * 48}
              r="4.5"
              fill={Colors.ink}
            />
          </Svg>
        ) : (
          <Text style={styles.empty}>Apunta el peso un par de días para ver la tendencia.</Text>
        )}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  title: { ...Type.title, color: Colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpi: { width: '47%', flexGrow: 1, padding: 14, gap: 6 },
  kpiLabel: { ...Type.caption, color: Colors.text2, fontFamily: 'Outfit_600SemiBold' },
  kpiValue: { ...tabular, fontFamily: 'Outfit_600SemiBold', fontSize: 26, lineHeight: 32, letterSpacing: -0.4, color: Colors.ink },
  unit: { fontFamily: 'Outfit_400Regular', fontSize: 13, color: Colors.text3 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  section: { ...Type.section, color: Colors.ink },
  meta: { ...Type.caption, ...tabular, color: Colors.text3 },
  barLabels: { flexDirection: 'row', marginTop: 6 },
  barLabel: { flex: 1, textAlign: 'center', ...Type.caption, ...tabular, fontSize: 11, color: Colors.text2 },
  empty: { ...Type.body, color: Colors.text3 },
  habit: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  habitName: { width: 110, ...Type.caption, color: Colors.ink, fontSize: 14 },
  cell: { flex: 1, height: 22, borderRadius: 6 },
});

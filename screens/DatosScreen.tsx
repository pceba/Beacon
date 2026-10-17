import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDays, format } from 'date-fns';
import { ChartBar, ColumnChart } from '../components/charts/ColumnChart';
import { HabitRow, HabitGrid } from '../components/charts/HabitGrid';
import { ChartPoint, LineChart } from '../components/charts/LineChart';
import { Sparkline } from '../components/charts/Sparkline';
import { TrainDay, TrainingStrip } from '../components/charts/TrainingStrip';
import { Card } from '../components/ui/Card';
import { InlineError } from '../components/ui/InlineError';
import { Segmented } from '../components/ui/Segmented';
import { Colors } from '../constants/colors';
import { Spacing, tabClearance } from '../constants/spacing';
import { Type, tabular } from '../constants/typography';
import { getCurrentUserId } from '../services/authService';
import { getBodyMetrics } from '../services/bodyMetricsService';
import { getHabitLogs, getHabits } from '../services/habitService';
import { getMoodLogs } from '../services/moodService';
import { getNutritionLogs } from '../services/nutritionService';
import { getPreferences } from '../services/preferencesService';
import { getSleepLogs } from '../services/sleepService';
import { getWaterLogs } from '../services/waterService';
import { getWorkouts } from '../services/workoutService';
import { RootStackParamList } from '../types/navigation';
import { formatFlexible, formatNumber } from '../utils/format';
import { shortDay, weekdayName } from '../utils/labels';
import { moodScale } from '../utils/mood';

type Period = '7' | '30' | '90';
type Tone = 'up' | 'down' | 'flat';

type Kpi = {
  label: string;
  color: string;
  value: string;
  unit: string;
  spark: Array<number | null>;
  delta: string | null;
  tone: Tone;
  empty: boolean;
  emptyNote: string;
};

type Snapshot = {
  range: string;
  goalLabel: string;
  goal: number;
  kpis: Kpi[];
  sleepBars: ChartBar[];
  sleepMeta: string;
  hasSleep: boolean;
  habitRate: number;
  habitDays: string[];
  habits: HabitRow[];
  weightValue: number | null;
  weightPhrase: string | null;
  weightTone: Tone;
  weightPoints: ChartPoint[];
  weightStart: string;
  weightEnd: string;
  trainMeta: string;
  trainDays: TrainDay[];
  trainBars: ChartBar[];
  trainCount: number;
};

const DAY = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const dayKey = (date: Date) => format(date, 'yyyy-MM-dd');

const hoursBetween = (bed: string, wake: string) => {
  const hours = (new Date(wake).getTime() - new Date(bed).getTime()) / 3_600_000;
  if (!Number.isFinite(hours) || hours <= 0) return 0;
  return Math.min(hours, 24);
};

const mean = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

const spanOf = (end: Date, count: number) =>
  Array.from({ length: count }, (_, index) => {
    const date = addDays(end, index - (count - 1));
    return { date, key: dayKey(date) };
  });

const rangeLabel = (start: Date, end: Date) => {
  const left = formatNumber(start.getDate());
  const right = formatNumber(end.getDate());
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${left} – ${right} ${MONTHS[end.getMonth()]}`;
  }
  return `${left} ${MONTHS[start.getMonth()]} – ${right} ${MONTHS[end.getMonth()]}`;
};

const toneOf = (delta: number) => (Math.abs(delta) < 0.05 ? 'flat' : delta > 0 ? 'up' : 'down');

const signed = (delta: number, digits: number) => `${delta > 0 ? '+' : '−'}${formatFlexible(Math.abs(delta), digits)}`;

const periodTail = (period: Period) => (period === '7' ? 'vs. semana pasada' : period === '30' ? 'vs. mes pasado' : 'vs. hace 3 meses');

const periodPhrase = (period: Period) => (period === '7' ? 'esta semana' : period === '30' ? 'este mes' : 'en 3 meses');

const emptyNote = (period: Period) =>
  period === '7' ? 'Sin registros esta semana' : period === '30' ? 'Sin registros este mes' : 'Sin registros en 3 meses';

const chunks = <T,>(items: T[], size: number) => {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) groups.push(items.slice(index, index + size));
  return groups;
};

export const DatosScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [period, setPeriod] = useState<Period>('7');
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [data, setData] = useState<Snapshot | null>(null);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setFailed(false);
    try {
      const userId = await getCurrentUserId();
      const count = period === '7' ? 7 : period === '30' ? 30 : 91;
      const end = new Date();
      const current = spanOf(end, count);
      const previous = spanOf(addDays(current[0].date, -1), count);
      const startKey = current[0].key;
      const endKey = current[current.length - 1].key;
      const prevStart = previous[0].key;
      const prevEnd = previous[previous.length - 1].key;
      const inSpan = (key: string, from: string, to: string) => key >= from && key <= to;

      const [prefs, sleeps, waters, meals, workouts, habits, logs, metrics, moods] = await Promise.all([
        getPreferences(),
        getSleepLogs(userId),
        getWaterLogs(userId),
        getNutritionLogs(userId),
        getWorkouts(userId),
        getHabits(userId),
        getHabitLogs(userId),
        getBodyMetrics(userId),
        getMoodLogs(userId),
      ]);

      const sleepMap = new Map<string, number>();
      sleeps.forEach((row) => {
        const key = row.created_at.slice(0, 10);
        const hours = hoursBetween(row.bed_time, row.wake_time);
        if (hours > 0) sleepMap.set(key, Math.max(sleepMap.get(key) ?? 0, hours));
      });
      const waterMap = new Map<string, number>();
      waters.forEach((row) => {
        const key = row.log_date.slice(0, 10);
        waterMap.set(key, (waterMap.get(key) ?? 0) + row.amount_ml);
      });
      const calorieMap = new Map<string, number>();
      meals.forEach((row) => {
        const key = row.logged_at.slice(0, 10);
        calorieMap.set(key, (calorieMap.get(key) ?? 0) + row.calories);
      });
      const moodMap = new Map<string, number>();
      moods.forEach((row) => {
        const score = moodScale(row.mood_score);
        if (score != null) moodMap.set(row.log_date.slice(0, 10), score);
      });
      const workoutMap = new Map<string, string[]>();
      workouts
        .filter((row) => row.completed)
        .forEach((row) => {
          const key = row.started_at.slice(0, 10);
          const names = workoutMap.get(key) ?? [];
          names.push(row.name);
          workoutMap.set(key, names);
        });

      const valuesOf = (days: typeof current, map: Map<string, number>) => days.flatMap((day) => (map.has(day.key) ? [map.get(day.key) as number] : []));
      const sleepNow = valuesOf(current, sleepMap);
      const sleepPrev = valuesOf(previous, sleepMap);
      const sleepAvg = mean(sleepNow);
      const sleepDelta = sleepAvg - mean(sleepPrev);
      const waterNow = valuesOf(current, waterMap);
      const waterPrev = valuesOf(previous, waterMap);
      const waterAvg = mean(waterNow);
      const waterDelta = waterAvg - mean(waterPrev);
      const calorieNow = valuesOf(current, calorieMap);
      const caloriePrev = valuesOf(previous, calorieMap);
      const calorieAvg = mean(calorieNow);
      const calorieDelta = calorieAvg - mean(caloriePrev);
      const moodNow = valuesOf(current, moodMap);
      const moodPrev = valuesOf(previous, moodMap);
      const moodAvg = mean(moodNow);
      const moodDelta = moodAvg - mean(moodPrev);
      const note = emptyNote(period);
      const tail = periodTail(period);
      const waterParts = waterAvg < 1000
        ? { value: formatNumber(Math.round(waterAvg)), unit: 'ml/día' }
        : { value: formatFlexible(waterAvg / 1000, 2), unit: 'L/día' };

      const deltaText = (comparable: boolean, delta: number, label: string) => {
        if (!comparable) return null;
        if (Math.abs(delta) < 0.05) return 'igual';
        return label;
      };

      const kpis: Kpi[] = [
        {
          label: 'Sueño',
          color: Colors.sleep,
          value: formatFlexible(sleepAvg, 1),
          unit: 'h',
          spark: current.map((day) => sleepMap.get(day.key) ?? null),
          delta: deltaText(sleepPrev.length > 0 && sleepNow.length > 0, sleepDelta, `${signed(sleepDelta, 1)} h ${tail}`),
          tone: toneOf(sleepDelta),
          empty: sleepNow.length === 0,
          emptyNote: note,
        },
        {
          label: 'Agua',
          color: Colors.water,
          value: waterParts.value,
          unit: waterParts.unit,
          spark: current.map((day) => (waterMap.has(day.key) ? (waterMap.get(day.key) as number) / 1000 : null)),
          delta: deltaText(
            waterPrev.length > 0 && waterNow.length > 0,
            waterDelta,
            waterParts.unit.startsWith('L')
              ? `${waterDelta > 0 ? '+' : '−'}${formatFlexible(Math.abs(waterDelta) / 1000, 2)} L`
              : `${waterDelta > 0 ? '+' : '−'}${formatNumber(Math.round(Math.abs(waterDelta)))} ml`,
          ),
          tone: toneOf(waterDelta),
          empty: waterNow.length === 0,
          emptyNote: note,
        },
        {
          label: 'Calorías',
          color: Colors.food,
          value: formatNumber(Math.round(calorieAvg)),
          unit: 'kcal/día',
          spark: current.map((day) => calorieMap.get(day.key) ?? null),
          delta: deltaText(
            caloriePrev.length > 0 && calorieNow.length > 0,
            calorieDelta,
            Math.abs(calorieDelta) < 0.5 ? 'igual' : `${calorieDelta > 0 ? '+' : '−'}${formatNumber(Math.abs(Math.round(calorieDelta)))} kcal`,
          ),
          tone: Math.abs(calorieDelta) < 0.5 ? 'flat' : toneOf(calorieDelta),
          empty: calorieNow.length === 0,
          emptyNote: note,
        },
        {
          label: 'Ánimo',
          color: Colors.mood,
          value: formatFlexible(moodAvg, 1),
          unit: 'de 5',
          spark: current.map((day) => moodMap.get(day.key) ?? null),
          delta: deltaText(moodPrev.length > 0 && moodNow.length > 0, moodDelta, signed(moodDelta, 1)),
          tone: toneOf(moodDelta),
          empty: moodNow.length === 0,
          emptyNote: note,
        },
      ];

      const dailyBar = (day: (typeof current)[number], label: string, bold: boolean): ChartBar => {
        const hours = sleepMap.get(day.key) ?? 0;
        const when = `${weekdayName(day.date)} ${formatNumber(day.date.getDate())}`;
        return {
          value: hours,
          label,
          bold,
          tooltip: hours > 0 ? `${formatFlexible(hours, 1)} h · ${when}` : `Sin registro · ${when}`,
          accessibilityLabel: hours > 0 ? `${when}, ${formatFlexible(hours, 1)} horas` : `${when}, sin registro`,
        };
      };

      let sleepBars: ChartBar[] = [];
      if (period === '7') {
        sleepBars = current.map((day, index) => dailyBar(day, DAY[day.date.getDay()], index === current.length - 1));
      } else if (period === '30') {
        sleepBars = current.map((day, index) => {
          const last = index === current.length - 1;
          const show = last || (index % 7 === 0 && index < current.length - 2);
          return dailyBar(day, show ? shortDay(day.date) : '', last);
        });
      } else {
        sleepBars = chunks(current, 7).map((week, index, all) => {
          const recorded = week.flatMap((day) => (sleepMap.has(day.key) ? [sleepMap.get(day.key) as number] : []));
          const avg = mean(recorded);
          const show = index % 4 === 0 || index === all.length - 1;
          return {
            value: avg,
            label: show ? shortDay(week[0].date) : '',
            bold: index === all.length - 1,
            tooltip: recorded.length ? `${formatFlexible(avg, 1)} h · semana del ${shortDay(week[0].date)}` : `Sin registro · semana del ${shortDay(week[0].date)}`,
            accessibilityLabel: `Semana del ${shortDay(week[0].date)}, media ${formatFlexible(avg, 1)} horas`,
          };
        });
      }

      const met = current.filter((day) => (sleepMap.get(day.key) ?? 0) >= prefs.sleepHours).length;
      const sleepMeta = `media ${formatFlexible(sleepAvg, 1)} h · ${formatNumber(met)} de ${formatNumber(current.length)} noches ≥ ${formatFlexible(prefs.sleepHours, 1)} h`;

      const habitDays = period === '7' ? current.map((day) => DAY[day.date.getDay()]) : [];
      const habitRows: HabitRow[] = habits.map((habit) => {
        const hits = current.filter((day) => logs.some((log) => log.habit_id === habit.id && log.completed && log.log_date.slice(0, 10) === day.key)).length;
        return {
          name: habit.name,
          color: habit.color || Colors.accent,
          rate: current.length ? Math.round((hits / current.length) * 100) : 0,
          cells: current.map((day, index) => ({
            on: logs.some((log) => log.habit_id === habit.id && log.completed && log.log_date.slice(0, 10) === day.key),
            today: index === current.length - 1,
          })),
        };
      });
      const possible = habitRows.length * current.length;
      const habitHits = habitRows.reduce((sum, row) => sum + row.cells.filter((cell) => cell.on).length, 0);

      const weights = metrics
        .filter((row) => row.weight_kg != null && inSpan(row.date.slice(0, 10), startKey, endKey))
        .sort((a, b) => a.date.localeCompare(b.date));
      const weightPoints: ChartPoint[] = weights.map((row) => {
        const value = row.weight_kg ?? 0;
        const when = row.date.slice(0, 10) === endKey ? 'hoy' : shortDay(row.date);
        return {
          value,
          tooltip: `${formatFlexible(value, 1)} kg · ${when}`,
          accessibilityLabel: `${formatFlexible(value, 1)} kilogramos, ${when}`,
        };
      });
      const firstWeight = weights[0]?.weight_kg;
      const lastWeight = weights[weights.length - 1]?.weight_kg;
      const weightDelta = firstWeight != null && lastWeight != null && weights.length > 1 ? lastWeight - firstWeight : null;
      const daySpan = weights.length > 1 ? Math.max(1, Math.round((new Date(weights[weights.length - 1].date).getTime() - new Date(weights[0].date).getTime()) / 86_400_000)) : 0;
      const weightPhrase =
        weightDelta == null
          ? null
          : Math.abs(weightDelta) < 0.05
            ? 'igual'
            : `${signed(weightDelta, 1)} kg ${daySpan >= 14 ? `en ${formatNumber(Math.max(1, Math.round(daySpan / 7)))} semanas` : `en ${formatNumber(daySpan)} días`}`;

      const trainCount = current.reduce((sum, day) => sum + (workoutMap.get(day.key)?.length ?? 0), 0);
      const trainDays: TrainDay[] = (period === '7' ? current : []).map((day) => {
        const names = workoutMap.get(day.key) ?? [];
        const tag = names[0] ? names[0].trim().slice(0, 3) : '';
        return {
          label: DAY[day.date.getDay()],
          tag,
          accessibilityLabel: tag ? `${weekdayName(day.date)}, ${names[0]}` : `${weekdayName(day.date)}, sin entreno`,
        };
      });
      const trainGroups = period === '7' ? [] : chunks(current, 7);
      const trainBars: ChartBar[] = trainGroups.map((week, index, all) => {
        const total = week.reduce((sum, day) => sum + (workoutMap.get(day.key)?.length ?? 0), 0);
        const show = all.length <= 7 || index % 4 === 0 || index === all.length - 1;
        return {
          value: total,
          label: show ? shortDay(week[0].date) : '',
          bold: index === all.length - 1,
          tooltip: `${formatNumber(total)} ${total === 1 ? 'entreno' : 'entrenos'} · ${shortDay(week[0].date)}`,
          accessibilityLabel: `Semana del ${shortDay(week[0].date)}, ${formatNumber(total)} entrenos`,
        };
      });

      setData({
        range: rangeLabel(current[0].date, end),
        goal: prefs.sleepHours,
        goalLabel: `${formatFlexible(prefs.sleepHours, 1)} h`,
        kpis,
        sleepBars,
        sleepMeta,
        hasSleep: sleepNow.length > 0,
        habitRate: possible ? Math.round((habitHits / possible) * 100) : 0,
        habitDays,
        habits: habitRows,
        weightValue: lastWeight ?? null,
        weightPhrase,
        weightTone: weightDelta == null ? 'flat' : weightDelta < -0.05 ? 'up' : weightDelta > 0.05 ? 'down' : 'flat',
        weightPoints,
        weightStart: weights[0] ? shortDay(weights[0].date) : '',
        weightEnd: weights.length && weights[weights.length - 1].date.slice(0, 10) === endKey ? 'hoy' : weights.length ? shortDay(weights[weights.length - 1].date) : '',
        trainMeta: `${formatNumber(trainCount)} ${periodPhrase(period)}`,
        trainDays,
        trainBars,
        trainCount,
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

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg, paddingBottom: tabClearance(insets.bottom) + 24 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.ink} />}
    >
      <View style={styles.header}>
        <Text style={styles.overline}>{data?.range ?? ''}</Text>
        <Text style={styles.title}>Datos</Text>
      </View>
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

      <View style={styles.board}>
        {(data?.kpis ?? []).map((kpi, index) => (
          <View key={kpi.label} style={[styles.cell, index % 2 === 1 ? styles.cellEdge : null, index >= 2 ? styles.cellBottom : null]}>
            <View style={styles.metricLabel}>
              <View style={[styles.dot, { backgroundColor: kpi.color }]} />
              <Text style={styles.metricName}>{kpi.label}</Text>
            </View>
            {kpi.empty ? (
              <>
                <Text maxFontSizeMultiplier={1.3} style={styles.kpiValue}>—</Text>
                <Text style={styles.note}>{kpi.emptyNote}</Text>
              </>
            ) : (
              <>
                <Text maxFontSizeMultiplier={1.3} style={styles.kpiValue}>
                  {kpi.value}
                  {kpi.unit ? <Text style={styles.unit}> {kpi.unit}</Text> : null}
                </Text>
                <Sparkline values={kpi.spark} color={kpi.color} />
                {kpi.delta ? <Text style={[styles.delta, styles[kpi.tone]]}>{kpi.delta}</Text> : null}
              </>
            )}
          </View>
        ))}
      </View>

      <Card style={styles.sectionCard}>
        <View style={styles.sectionHead}>
          <Text style={styles.section}>Sueño</Text>
          {data?.hasSleep ? <Text style={styles.meta}>{data.sleepMeta}</Text> : null}
        </View>
        {data?.hasSleep ? (
          <>
            <ColumnChart bars={data.sleepBars} color={Colors.sleep} goal={data.goal} goalLabel={data.goalLabel} animateKey={period} />
            <Text style={styles.note}>Toca una barra para ver la noche. Las claras quedan por debajo del objetivo.</Text>
          </>
        ) : data ? (
          <View style={styles.emptyChart}>
            <View style={styles.goalLine} />
            <Text style={styles.emptyTitle}>Aún no hay noches registradas</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Registrar sueño" onPress={() => navigation.navigate('LogSleepScreen', { fromToday: false })}>
              <Text style={styles.emptyLink}>Registrar sueño</Text>
            </Pressable>
          </View>
        ) : null}
      </Card>

      <Card style={styles.sectionCard}>
        <View style={styles.sectionHead}>
          <Text style={styles.section}>Hábitos</Text>
          {data && data.habits.length > 0 ? <Text style={styles.meta}>{formatNumber(data.habitRate)} % {periodPhrase(period)}</Text> : null}
        </View>
        {!data ? null : data.habits.length === 0 ? <Text style={styles.empty}>Aún no hay hábitos.</Text> : <HabitGrid mode={period === '7' ? 'week' : 'meter'} days={data.habitDays} rows={data.habits} />}
      </Card>

      <Card style={styles.sectionCard}>
        <View style={styles.sectionHead}>
          <Text style={styles.section}>Peso</Text>
          {data?.weightPhrase ? <Text style={[styles.metaStrong, data.weightTone === 'up' ? styles.up : data.weightTone === 'down' ? styles.down : styles.flat]}>{data.weightPhrase}</Text> : null}
        </View>
        <Text maxFontSizeMultiplier={1.3} style={styles.weightValue}>
          {data?.weightValue != null ? formatFlexible(data.weightValue, 1) : '—'}
          {data?.weightValue != null ? <Text style={styles.unit}> kg</Text> : null}
        </Text>
        {data && data.weightPoints.length > 1 ? (
          <LineChart points={data.weightPoints} startLabel={data.weightStart} endLabel={data.weightEnd} />
        ) : data ? (
          <Text style={styles.empty}>Apunta el peso un par de días para ver la tendencia.</Text>
        ) : null}
      </Card>

      <Card style={styles.sectionCard}>
        <View style={styles.sectionHead}>
          <Text style={styles.section}>Entrenos</Text>
          {data ? <Text style={styles.meta}>{data.trainMeta}</Text> : null}
        </View>
        {data && data.trainCount > 0 ? (
          <TrainingStrip mode={period === '7' ? 'week' : 'bars'} days={data.trainDays} bars={data.trainBars} animateKey={period} />
        ) : data ? (
          <Text style={styles.empty}>Aún no hay entrenos.</Text>
        ) : null}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  header: { gap: 4 },
  overline: { ...Type.overline, color: Colors.text3 },
  title: { ...Type.title, color: Colors.ink },
  board: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: Colors.surface, borderRadius: 18, overflow: 'hidden' },
  cell: {
    width: '50%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 4,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  cellEdge: { borderRightWidth: 0 },
  cellBottom: { borderBottomWidth: 0 },
  metricLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  metricName: { ...Type.label, color: Colors.text3 },
  kpiValue: { ...tabular, fontFamily: 'Outfit_600SemiBold', fontSize: 26, lineHeight: 32, letterSpacing: -0.6, color: Colors.ink },
  unit: { fontFamily: 'Outfit_400Regular', fontSize: 13, color: Colors.text3 },
  delta: { ...tabular, fontFamily: 'Outfit_600SemiBold', fontSize: 12, lineHeight: 16 },
  up: { color: Colors.success },
  down: { color: Colors.danger },
  flat: { color: Colors.text2 },
  sectionCard: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  section: { ...Type.section, color: Colors.ink },
  meta: { ...Type.caption, ...tabular, color: Colors.text3, flexShrink: 1, textAlign: 'right' },
  metaStrong: { ...tabular, fontFamily: 'Outfit_600SemiBold', fontSize: 13, flexShrink: 1, textAlign: 'right' },
  weightValue: { ...tabular, fontFamily: 'Outfit_600SemiBold', fontSize: 30, lineHeight: 36, letterSpacing: -0.8, color: Colors.ink },
  note: { ...Type.caption, color: Colors.text3 },
  empty: { ...Type.body, color: Colors.text3 },
  emptyChart: { height: 140, borderRadius: 14, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' },
  goalLine: { position: 'absolute', left: 14, right: 14, top: 48, borderTopWidth: 1, borderColor: Colors.sleep, opacity: 0.45 },
  emptyTitle: { ...Type.bodyStrong, color: Colors.ink, backgroundColor: Colors.fill, paddingHorizontal: 8 },
  emptyLink: { ...Type.bodyStrong, color: Colors.accent, backgroundColor: Colors.fill, paddingHorizontal: 8 },
});

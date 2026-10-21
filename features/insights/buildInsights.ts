import { ChartBar } from '../../components/charts/ColumnChart';
import { HabitRow } from '../../components/charts/HabitGrid';
import { ChartPoint } from '../../components/charts/LineChart';
import { TrainDay } from '../../components/charts/TrainingStrip';
import { Colors } from '../../constants/colors';
import { Preferences } from '../../services/preferencesService';
import { BodyMetric, Habit, HabitLog, MoodLog, NutritionLog, SleepLog, WaterLog, Workout } from '../../types/database';
import { addDays, dayOf } from '../../utils/dates';
import { formatFlexible, formatNumber } from '../../utils/format';
import { shortDay, weekdayName } from '../../utils/labels';
import { moodScale } from '../../utils/mood';
import { buildKpis } from './buildKpis';
import { chunks, DAY, Day, hoursBetween, mean, Period, periodDays, periodPhrase, rangeLabel, signed, Snapshot, spanOf, valuesOf } from './insightsMath';

export type InsightsInput = {
  period: Period;
  end: Date;
  prefs: Preferences;
  sleeps: SleepLog[];
  waters: WaterLog[];
  meals: NutritionLog[];
  workouts: Workout[];
  habits: Habit[];
  habitLogs: HabitLog[];
  metrics: BodyMetric[];
  moods: MoodLog[];
};

const sumBy = <T,>(rows: T[], keyOf: (row: T) => string, valueOf: (row: T) => number) => {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const key = keyOf(row);
    map.set(key, (map.get(key) ?? 0) + valueOf(row));
  });
  return map;
};

const sleepBarsOf = (period: Period, current: Day[], sleepMap: Map<string, number>): ChartBar[] => {
  const dailyBar = (day: Day, label: string, bold: boolean): ChartBar => {
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
  if (period === '7') return current.map((day, index) => dailyBar(day, DAY[day.date.getDay()], index === current.length - 1));
  if (period === '30') {
    return current.map((day, index) => {
      const last = index === current.length - 1;
      const show = last || (index % 7 === 0 && index < current.length - 2);
      return dailyBar(day, show ? shortDay(day.date) : '', last);
    });
  }
  return chunks(current, 7).map((week, index, all) => {
    const avg = mean(valuesOf(week, sleepMap));
    const recorded = week.some((day) => sleepMap.has(day.key));
    const show = index % 4 === 0 || index === all.length - 1;
    return {
      value: avg,
      label: show ? shortDay(week[0].date) : '',
      bold: index === all.length - 1,
      tooltip: recorded ? `${formatFlexible(avg, 1)} h · semana del ${shortDay(week[0].date)}` : `Sin registro · semana del ${shortDay(week[0].date)}`,
      accessibilityLabel: `Semana del ${shortDay(week[0].date)}, media ${formatFlexible(avg, 1)} horas`,
    };
  });
};

const habitRowsOf = (habits: Habit[], logs: HabitLog[], current: Day[]): HabitRow[] => {
  const done = new Set(logs.filter((log) => log.completed).map((log) => `${log.habit_id}|${dayOf(log.log_date)}`));
  return habits.map((habit) => {
    const cells = current.map((day, index) => ({ on: done.has(`${habit.id}|${day.key}`), today: index === current.length - 1 }));
    const hits = cells.filter((cell) => cell.on).length;
    return {
      name: habit.name,
      color: habit.color || Colors.accent,
      rate: current.length ? Math.round((hits / current.length) * 100) : 0,
      cells,
    };
  });
};

const weightOf = (metrics: BodyMetric[], startKey: string, endKey: string) => {
  const weights = metrics
    .filter((row) => row.weight_kg != null && dayOf(row.date) >= startKey && dayOf(row.date) <= endKey)
    .sort((a, b) => a.date.localeCompare(b.date));
  const points: ChartPoint[] = weights.map((row) => {
    const value = row.weight_kg ?? 0;
    const when = dayOf(row.date) === endKey ? 'hoy' : shortDay(row.date);
    return { value, tooltip: `${formatFlexible(value, 1)} kg · ${when}`, accessibilityLabel: `${formatFlexible(value, 1)} kilogramos, ${when}` };
  });
  const first = weights[0];
  const last = weights[weights.length - 1];
  const delta = first?.weight_kg != null && last?.weight_kg != null && weights.length > 1 ? last.weight_kg - first.weight_kg : null;
  const daySpan = weights.length > 1 ? Math.max(1, Math.round((new Date(last.date).getTime() - new Date(first.date).getTime()) / 86_400_000)) : 0;
  const phrase =
    delta == null
      ? null
      : Math.abs(delta) < 0.05
        ? 'igual'
        : `${signed(delta, 1)} kg ${daySpan >= 14 ? `en ${formatNumber(Math.max(1, Math.round(daySpan / 7)))} semanas` : `en ${formatNumber(daySpan)} días`}`;
  return {
    weightValue: last?.weight_kg ?? null,
    weightPhrase: phrase,
    weightTone: (delta == null ? 'flat' : delta < -0.05 ? 'up' : delta > 0.05 ? 'down' : 'flat') as Snapshot['weightTone'],
    weightPoints: points,
    weightStart: first ? shortDay(first.date) : '',
    weightEnd: last && dayOf(last.date) === endKey ? 'hoy' : last ? shortDay(last.date) : '',
  };
};

const trainingOf = (period: Period, current: Day[], workouts: Workout[]) => {
  const byDay = new Map<string, string[]>();
  workouts
    .filter((row) => row.completed)
    .forEach((row) => {
      const key = dayOf(row.started_at);
      const names = byDay.get(key) ?? [];
      names.push(row.name);
      byDay.set(key, names);
    });
  const countOf = (day: Day) => byDay.get(day.key)?.length ?? 0;
  const trainCount = current.reduce((sum, day) => sum + countOf(day), 0);
  const trainDays: TrainDay[] = (period === '7' ? current : []).map((day) => {
    const names = byDay.get(day.key) ?? [];
    const tag = names[0] ? names[0].trim().slice(0, 3) : '';
    return { label: DAY[day.date.getDay()], tag, accessibilityLabel: tag ? `${weekdayName(day.date)}, ${names[0]}` : `${weekdayName(day.date)}, sin entreno` };
  });
  const trainBars: ChartBar[] = (period === '7' ? [] : chunks(current, 7)).map((week, index, all) => {
    const total = week.reduce((sum, day) => sum + countOf(day), 0);
    const show = all.length <= 7 || index % 4 === 0 || index === all.length - 1;
    return {
      value: total,
      label: show ? shortDay(week[0].date) : '',
      bold: index === all.length - 1,
      tooltip: `${formatNumber(total)} ${total === 1 ? 'entreno' : 'entrenos'} · ${shortDay(week[0].date)}`,
      accessibilityLabel: `Semana del ${shortDay(week[0].date)}, ${formatNumber(total)} entrenos`,
    };
  });
  return { trainCount, trainDays, trainBars, trainMeta: `${formatNumber(trainCount)} ${periodPhrase(period)}` };
};

export const buildInsights = (input: InsightsInput): Snapshot => {
  const { period, end, prefs } = input;
  const count = periodDays(period);
  const current = spanOf(end, count);
  const previous = spanOf(addDays(current[0].date, -1), count);
  const startKey = current[0].key;
  const endKey = current[current.length - 1].key;

  const sleepMap = new Map<string, number>();
  input.sleeps.forEach((row) => {
    const key = dayOf(row.created_at);
    const hours = hoursBetween(row.bed_time, row.wake_time);
    if (hours > 0) sleepMap.set(key, Math.max(sleepMap.get(key) ?? 0, hours));
  });
  const moodMap = new Map<string, number>();
  input.moods.forEach((row) => {
    const score = moodScale(row.mood_score);
    if (score != null) moodMap.set(dayOf(row.log_date), score);
  });
  const maps = {
    sleep: sleepMap,
    water: sumBy(input.waters, (row) => dayOf(row.log_date), (row) => row.amount_ml),
    calories: sumBy(input.meals, (row) => dayOf(row.logged_at), (row) => row.calories),
    mood: moodMap,
  };

  const sleepNow = valuesOf(current, sleepMap);
  const met = current.filter((day) => (sleepMap.get(day.key) ?? 0) >= prefs.sleepHours).length;
  const habits = habitRowsOf(input.habits, input.habitLogs, current);
  const possible = habits.length * current.length;
  const habitHits = habits.reduce((sum, row) => sum + row.cells.filter((cell) => cell.on).length, 0);

  return {
    period,
    range: rangeLabel(current[0].date, end),
    goal: prefs.sleepHours,
    goalLabel: `${formatFlexible(prefs.sleepHours, 1)} h`,
    kpis: buildKpis(period, current, previous, maps),
    sleepBars: sleepBarsOf(period, current, sleepMap),
    sleepMeta: `media ${formatFlexible(mean(sleepNow), 1)} h · ${formatNumber(met)} de ${formatNumber(current.length)} noches ≥ ${formatFlexible(prefs.sleepHours, 1)} h`,
    hasSleep: sleepNow.length > 0,
    habitRate: possible ? Math.round((habitHits / possible) * 100) : 0,
    habitDays: period === '7' ? current.map((day) => DAY[day.date.getDay()]) : [],
    habits,
    ...weightOf(input.metrics, startKey, endKey),
    ...trainingOf(period, current, input.workouts),
  };
};

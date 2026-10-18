import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { X } from 'lucide-react-native';
import { Card } from './ui/Card';
import { Colors } from '../constants/colors';
import { Type, tabular } from '../constants/typography';
import { light } from '../lib/haptics';
import { getStored, setStored } from '../lib/storage';
import { getCurrentUserId } from '../services/authService';
import { getHabitLogs, getHabits } from '../services/habitService';
import { getMoodLogs } from '../services/moodService';
import { getPreferences } from '../services/preferencesService';
import { getSleepLogs } from '../services/sleepService';
import { getWaterLogs } from '../services/waterService';
import { getWorkouts } from '../services/workoutService';
import { monthDay } from '../utils/labels';
import { formatFlexible, formatNumber, formatWater } from '../utils/format';
import { Metric, summaryWeekStart, weeklySummary, WeeklySummary } from '../utils/weeklySummary';

// Tarjeta del resumen semanal en Hoy: solo domingo y lunes, y se puede cerrar por semana.
const DISMISS_KEY = 'lifepp_weekly_dismissed';

type Props = { onOpen: () => void };

type Stat = {
  label: string;
  color: string;
  value: string;
  delta: string | null; // null: la semana anterior no tiene datos; '': igual
  tone: 'up' | 'down' | 'flat';
};

const toneOf = (delta: number | null, epsilon: number): Stat['tone'] => (delta == null || Math.abs(delta) < epsilon ? 'flat' : delta > 0 ? 'up' : 'down');

const signed = (text: string, delta: number) => (delta > 0 ? `+${text}` : delta < 0 ? `−${text.replace('-', '')}` : text);

const stats = (summary: WeeklySummary): Stat[] => {
  const pick = (metric: Metric, label: string, color: string, show: (v: number) => string, showDelta: (d: number) => string, epsilon: number): Stat => ({
    label,
    color,
    value: metric.value == null ? '—' : show(metric.value),
    delta: metric.delta == null ? null : Math.abs(metric.delta) < epsilon ? '' : signed(showDelta(Math.abs(metric.delta)), metric.delta),
    tone: toneOf(metric.delta, epsilon),
  });
  return [
    pick(
      summary.sleepHours,
      'Sueño medio',
      Colors.sleep,
      (v) => `${formatFlexible(v, 1)} h`,
      (d) => `${formatFlexible(d, 1)} h`,
      0.1,
    ),
    pick(
      summary.workouts,
      'Entrenos',
      Colors.workout,
      (v) => formatNumber(v),
      (d) => formatNumber(d),
      1,
    ),
    pick(
      summary.habitRate,
      'Hábitos',
      Colors.accent,
      (v) => `${formatNumber(v)} %`,
      (d) => `${formatNumber(d)} pts`,
      1,
    ),
    pick(
      summary.waterMl,
      'Agua al día',
      Colors.water,
      (v) => formatWater(v),
      (d) => formatWater(d),
      50,
    ),
  ];
};

export const WeeklySummaryCard = ({ onOpen }: Props) => {
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [hidden, setHidden] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const today = new Date();
        const start = summaryWeekStart(today);
        if (!start) return setHidden(true);
        const weekKey = format(start, 'yyyy-MM-dd');
        if ((await getStored(DISMISS_KEY)) === weekKey) return setHidden(true);
        const userId = await getCurrentUserId();
        if (!userId) return;
        const [sleeps, waters, workouts, habits, habitLogs, moods, prefs] = await Promise.all([
          getSleepLogs(userId),
          getWaterLogs(userId),
          getWorkouts(userId),
          getHabits(userId),
          getHabitLogs(userId),
          getMoodLogs(userId),
          getPreferences(),
        ]);
        const next = weeklySummary({
          today,
          sleeps,
          waters,
          workouts,
          habits,
          habitLogs,
          moods,
          sleepGoalHours: prefs.sleepHours,
          waterGoalMl: prefs.waterMl,
        });
        if (!alive) return;
        setSummary(next);
        setHidden(!next || !next.hasData);
      })().catch((error) => console.error('Resumen semanal', error));
      return () => {
        alive = false;
      };
    }, []),
  );

  if (hidden || !summary) return null;

  const dismiss = () => {
    light();
    setHidden(true);
    void setStored(DISMISS_KEY, summary.weekKey);
  };

  const range =
    summary.start.getMonth() === summary.end.getMonth()
      ? `${formatNumber(summary.start.getDate())}–${monthDay(summary.end)}`
      : `${monthDay(summary.start)} – ${monthDay(summary.end)}`;

  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)}>
      <Card style={styles.card}>
        <View style={styles.head}>
          <View style={styles.headCopy}>
            <Text style={styles.overline}>Tu semana</Text>
            <Text style={styles.range}>{range}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar resumen semanal" hitSlop={10} onPress={dismiss} style={styles.close}>
            <X size={18} color={Colors.text2} strokeWidth={2.2} />
          </Pressable>
        </View>

        <Text style={styles.headline}>{summary.headline}</Text>

        <View style={styles.grid}>
          {stats(summary).map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <View style={styles.statLabel}>
                <View style={[styles.dot, { backgroundColor: stat.color }]} />
                <Text style={styles.statName}>{stat.label}</Text>
              </View>
              <Text style={styles.statValue} numberOfLines={1}>
                {stat.value}
              </Text>
              {stat.delta ? (
                <Text style={[styles.delta, stat.tone === 'up' ? styles.up : stat.tone === 'down' ? styles.down : null]}>{stat.delta} vs. anterior</Text>
              ) : stat.delta === '' ? (
                <Text style={styles.delta}>igual que la anterior</Text>
              ) : null}
            </View>
          ))}
        </View>

        {summary.bestStreak ? (
          <Text style={styles.streak}>
            Mejor racha: <Text style={styles.streakStrong}>{summary.bestStreak.name}</Text>, {formatNumber(summary.bestStreak.days)} días seguidos
          </Text>
        ) : null}

        <Pressable accessibilityRole="button" onPress={onOpen} hitSlop={6} style={styles.link}>
          <Text style={styles.linkText}>Ver en Datos</Text>
        </Pressable>
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: { gap: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start' },
  headCopy: { flex: 1, gap: 2 },
  overline: { ...Type.label, color: Colors.accent },
  range: { ...Type.caption, color: Colors.text2 },
  close: {
    width: 32,
    height: 32,
    marginTop: -6,
    marginRight: -6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  headline: { ...Type.section, color: Colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  stat: { width: '50%', gap: 2, paddingRight: 8 },
  statLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statName: { ...Type.caption, color: Colors.text2 },
  statValue: { ...Type.headline, ...tabular, color: Colors.ink },
  delta: { ...Type.caption, ...tabular, color: Colors.text2 },
  up: { color: Colors.success },
  down: { color: Colors.danger },
  streak: { ...Type.caption, color: Colors.text2 },
  streakStrong: { color: Colors.ink, fontFamily: Type.bodyStrong.fontFamily },
  link: { alignSelf: 'flex-start', paddingVertical: 4 },
  linkText: { ...Type.bodyStrong, color: Colors.accent },
});

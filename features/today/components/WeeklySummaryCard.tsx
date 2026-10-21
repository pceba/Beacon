import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { Card } from '../../../components/ui/Card';
import { Colors } from '../../../constants/colors';
import { Type, tabular } from '../../../constants/typography';
import { useReduceMotion } from '../../../hooks/useReduceMotion';
import { formatNumber } from '../../../utils/format';
import { monthDay } from '../../../utils/labels';
import { useWeeklySummary } from '../hooks/useWeeklySummary';
import { weeklyStats } from '../weeklyStats';

// Tarjeta del resumen semanal en Hoy: solo domingo y lunes, y se puede cerrar por semana.
type Props = { todayKey: string; onOpen: () => void };

export const WeeklySummaryCard = memo(({ todayKey, onOpen }: Props) => {
  const { summary, dismiss } = useWeeklySummary(todayKey);
  const reduce = useReduceMotion();
  const stats = useMemo(() => (summary ? weeklyStats(summary) : []), [summary]);

  if (!summary) return null;

  const range =
    summary.start.getMonth() === summary.end.getMonth()
      ? `${formatNumber(summary.start.getDate())}–${monthDay(summary.end)}`
      : `${monthDay(summary.start)} – ${monthDay(summary.end)}`;

  return (
    <Animated.View entering={FadeIn.duration(reduce ? 120 : 220)} exiting={FadeOut.duration(reduce ? 120 : 160)}>
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
          {stats.map((stat) => (
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
});

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

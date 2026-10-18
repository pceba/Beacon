import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from '../../lib/toast';
import { ChartPoint, LineChart } from '../../components/charts/LineChart';
import { Card } from '../../components/ui/Card';
import { Segmented } from '../../components/ui/Segmented';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Type, tabular } from '../../constants/typography';
import { getCurrentUserId } from '../../services/authService';
import { getStrengthEntries } from '../../services/workoutService';
import { RootStackParamList } from '../../types/navigation';
import { exerciseSummaries, ExerciseSummary, formatBestSet } from '../../utils/exerciseProgress';
import { formatFlexible, formatNumber } from '../../utils/format';
import { shortDay } from '../../utils/labels';

type Metric = 'e1rm' | 'weight';

const todayKey = () => new Date().toISOString().slice(0, 10);

export const ExerciseProgressScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'ExerciseProgressScreen'>>();
  const [metric, setMetric] = useState<Metric>('e1rm');
  const [summary, setSummary] = useState<ExerciseSummary | null>(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const userId = await getCurrentUserId();
      const entries = await getStrengthEntries(userId);
      const match = exerciseSummaries(entries).find((item) => item.key === route.params.exerciseKey) ?? null;
      setSummary(match);
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha podido cargar el ejercicio', kind: 'error' });
    } finally {
      setReady(true);
    }
  }, [route.params.exerciseKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const plotted = (summary?.series ?? []).filter((session) => (metric === 'e1rm' ? session.e1rm : session.topWeight) != null);
  const best = metric === 'e1rm' ? summary?.bestE1rm : summary?.bestWeight;
  const markIndex = best ? plotted.findIndex((session) => session.date.slice(0, 10) === best.date && (metric === 'e1rm' ? session.e1rm : session.topWeight) === best.value) : -1;
  const points: ChartPoint[] = plotted.map((session) => {
    const value = (metric === 'e1rm' ? session.e1rm : session.topWeight) as number;
    const when = shortDay(session.date);
    return {
      value,
      tooltip: `${formatFlexible(value, 1)} kg · ${when}`,
      accessibilityLabel: `${formatFlexible(value, 1)} kilogramos, ${when}`,
    };
  });
  const endLabel = plotted.length && plotted[plotted.length - 1].date.slice(0, 10) === todayKey() ? 'hoy' : plotted.length ? shortDay(plotted[plotted.length - 1].date) : '';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 32 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Atrás" onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>Atrás</Text>
      </Pressable>
      <Text style={styles.title}>{summary?.name ?? 'Ejercicio'}</Text>
      {summary ? (
        <Text style={styles.meta}>
          {formatNumber(summary.sessions)} sesiones · última {shortDay(summary.lastDate)}
        </Text>
      ) : null}
      <Segmented
        value={metric}
        options={[
          { value: 'e1rm', label: '1RM estimado' },
          { value: 'weight', label: 'Peso máximo' },
        ]}
        onChange={setMetric}
      />
      {ready && !summary ? <Text style={styles.empty}>Este ejercicio aún no tiene dos sesiones con peso.</Text> : null}
      {summary && points.length > 0 ? (
        <Card>
          <LineChart
            points={points}
            startLabel={shortDay(plotted[0].date)}
            endLabel={endLabel}
            markIndex={markIndex >= 0 ? markIndex : null}
            markLabel={best ? `PR ${formatFlexible(best.value, 1)}` : undefined}
          />
          {summary.bestE1rm ? <Text style={styles.record}>Mejor 1RM {formatFlexible(summary.bestE1rm.value, 1)} kg · {shortDay(summary.bestE1rm.date)}</Text> : null}
          {summary.bestWeight ? <Text style={styles.record}>Mejor peso {formatFlexible(summary.bestWeight.value, 1)} kg · {shortDay(summary.bestWeight.date)}</Text> : null}
        </Card>
      ) : null}
      {summary ? (
        <Card>
          {[...summary.series].reverse().map((session) => (
            <View key={session.workoutId} style={styles.session}>
              <Text style={styles.sessionDate}>{shortDay(session.date)}</Text>
              <Text style={styles.sessionSet}>{formatBestSet(session.bestSet)}</Text>
            </View>
          ))}
        </Card>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  back: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  backText: { ...Type.body, color: Colors.text2 },
  title: { ...Type.title, color: Colors.ink },
  meta: { ...Type.caption, ...tabular, color: Colors.text3 },
  empty: { ...Type.body, color: Colors.text3 },
  record: { ...Type.caption, ...tabular, color: Colors.text2 },
  session: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.line },
  sessionDate: { ...Type.body, color: Colors.ink },
  sessionSet: { ...Type.bodyStrong, ...tabular, color: Colors.ink },
});

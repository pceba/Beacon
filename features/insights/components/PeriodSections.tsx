import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HabitGrid } from '../../../components/charts/HabitGrid';
import { LineChart } from '../../../components/charts/LineChart';
import { TrainingStrip } from '../../../components/charts/TrainingStrip';
import { Card } from '../../../components/ui/Card';
import { Colors } from '../../../constants/colors';
import { tabular } from '../../../constants/typography';
import { formatFlexible, formatNumber } from '../../../utils/format';
import { Period, periodPhrase, Snapshot } from '../insightsMath';
import { insightsStyles as shared } from './insightsStyles';

type Props = { data: Snapshot | null; period: Period };

export const HabitsSection = memo(({ data, period }: Props) => (
  <Card style={shared.sectionCard}>
    <View style={shared.sectionHead}>
      <Text style={shared.section}>Hábitos</Text>
      {data && data.habits.length > 0 ? (
        <Text style={shared.meta}>
          {formatNumber(data.habitRate)} % {periodPhrase(period)}
        </Text>
      ) : null}
    </View>
    {!data ? null : data.habits.length === 0 ? (
      <Text style={shared.empty}>Aún no hay hábitos.</Text>
    ) : (
      <HabitGrid mode={period === '7' ? 'week' : 'meter'} days={data.habitDays} rows={data.habits} />
    )}
  </Card>
));

export const WeightSection = memo(({ data }: { data: Snapshot | null }) => (
  <Card style={shared.sectionCard}>
    <View style={shared.sectionHead}>
      <Text style={shared.section}>Peso</Text>
      {data?.weightPhrase ? <Text style={[shared.metaStrong, shared[data.weightTone]]}>{data.weightPhrase}</Text> : null}
    </View>
    <Text maxFontSizeMultiplier={1.3} style={styles.weightValue}>
      {data?.weightValue != null ? formatFlexible(data.weightValue, 1) : '—'}
      {data?.weightValue != null ? <Text style={shared.unit}> kg</Text> : null}
    </Text>
    {data && data.weightPoints.length > 1 ? (
      <LineChart points={data.weightPoints} startLabel={data.weightStart} endLabel={data.weightEnd} />
    ) : data ? (
      <Text style={shared.empty}>Apunta el peso un par de días para ver la tendencia.</Text>
    ) : null}
  </Card>
));

export const TrainingSection = memo(({ data, period }: Props) => (
  <Card style={shared.sectionCard}>
    <View style={shared.sectionHead}>
      <Text style={shared.section}>Entrenos</Text>
      {data ? <Text style={shared.meta}>{data.trainMeta}</Text> : null}
    </View>
    {data && data.trainCount > 0 ? (
      <TrainingStrip mode={period === '7' ? 'week' : 'bars'} days={data.trainDays} bars={data.trainBars} animateKey={period} />
    ) : data ? (
      <Text style={shared.empty}>Aún no hay entrenos.</Text>
    ) : null}
  </Card>
));

const styles = StyleSheet.create({
  weightValue: { ...tabular, fontFamily: 'Outfit_600SemiBold', fontSize: 30, lineHeight: 36, letterSpacing: -0.8, color: Colors.ink },
});

import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ColumnChart } from '../../../components/charts/ColumnChart';
import { Card } from '../../../components/ui/Card';
import { Colors } from '../../../constants/colors';
import { Type } from '../../../constants/typography';
import { Period, Snapshot } from '../insightsMath';
import { insightsStyles as shared } from './insightsStyles';

type Props = { data: Snapshot | null; period: Period; onLog: () => void };

export const SleepSection = memo(({ data, period, onLog }: Props) => (
  <Card style={shared.sectionCard}>
    <View style={shared.sectionHead}>
      <Text style={shared.section}>Sueño</Text>
      {data?.hasSleep ? <Text style={shared.meta}>{data.sleepMeta}</Text> : null}
    </View>
    {data?.hasSleep ? (
      <>
        <ColumnChart bars={data.sleepBars} color={Colors.sleep} goal={data.goal} goalLabel={data.goalLabel} animateKey={period} />
        <Text style={shared.note}>Toca una barra para ver la noche. Las claras quedan por debajo del objetivo.</Text>
      </>
    ) : data ? (
      <View style={styles.emptyChart}>
        <View style={styles.goalLine} />
        <Text style={styles.emptyTitle}>Aún no hay noches registradas</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Registrar sueño" hitSlop={12} onPress={onLog}>
          <Text style={styles.emptyLink}>Registrar sueño</Text>
        </Pressable>
      </View>
    ) : null}
  </Card>
));

const styles = StyleSheet.create({
  emptyChart: { height: 140, borderRadius: 14, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' },
  goalLine: { position: 'absolute', left: 14, right: 14, top: 48, borderTopWidth: 1, borderColor: Colors.sleep, opacity: 0.45 },
  emptyTitle: { ...Type.bodyStrong, color: Colors.ink, backgroundColor: Colors.fill, paddingHorizontal: 8 },
  emptyLink: { ...Type.bodyStrong, color: Colors.accent, backgroundColor: Colors.fill, paddingHorizontal: 8 },
});

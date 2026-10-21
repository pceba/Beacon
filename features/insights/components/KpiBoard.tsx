import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Sparkline } from '../../../components/charts/Sparkline';
import { Colors } from '../../../constants/colors';
import { Type, tabular } from '../../../constants/typography';
import { Kpi } from '../insightsMath';
import { insightsStyles } from './insightsStyles';

export const KpiBoard = memo(({ kpis }: { kpis: Kpi[] }) => (
  <View style={styles.board}>
    {kpis.map((kpi, index) => (
      <KpiCell key={kpi.label} kpi={kpi} edge={index % 2 === 1} bottom={index >= 2} />
    ))}
  </View>
));

const KpiCell = memo(({ kpi, edge, bottom }: { kpi: Kpi; edge: boolean; bottom: boolean }) => (
  <View style={[styles.cell, edge ? styles.cellEdge : null, bottom ? styles.cellBottom : null]}>
    <View style={styles.metricLabel}>
      <View style={[styles.dot, { backgroundColor: kpi.color }]} />
      <Text style={styles.metricName}>{kpi.label}</Text>
    </View>
    {kpi.empty ? (
      <>
        <Text maxFontSizeMultiplier={1.3} style={styles.kpiValue}>
          —
        </Text>
        <Text style={insightsStyles.note}>{kpi.emptyNote}</Text>
      </>
    ) : (
      <>
        <Text maxFontSizeMultiplier={1.3} style={styles.kpiValue}>
          {kpi.value}
          {kpi.unit ? <Text style={insightsStyles.unit}> {kpi.unit}</Text> : null}
        </Text>
        <Sparkline values={kpi.spark} color={kpi.color} />
        {kpi.delta ? <Text style={[styles.delta, insightsStyles[kpi.tone]]}>{kpi.delta}</Text> : null}
      </>
    )}
  </View>
));

const styles = StyleSheet.create({
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
  delta: { ...tabular, fontFamily: 'Outfit_600SemiBold', fontSize: 12, lineHeight: 16 },
});

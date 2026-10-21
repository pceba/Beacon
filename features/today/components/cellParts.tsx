import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../../constants/colors';
import { Type, tabular } from '../../../constants/typography';

export const CellLabel = ({ name, color, children }: { name: string; color: string; children?: React.ReactNode }) => (
  <View style={cellStyles.metricLabel}>
    <View style={[cellStyles.catDot, { backgroundColor: color }]} />
    <Text style={cellStyles.metricName}>{name}</Text>
    {children}
  </View>
);

export const Track = ({ percent, color }: { percent: number; color: string }) => (
  <View style={cellStyles.track}>
    <View style={[cellStyles.fill, { width: `${percent}%`, backgroundColor: color }]} />
  </View>
);

export const cellStyles = StyleSheet.create({
  board: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: Colors.surface, borderRadius: 18, overflow: 'hidden' },
  cell: {
    width: '50%',
    padding: 16,
    gap: 8,
    minHeight: 112,
    justifyContent: 'flex-start',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  cellEdge: { borderRightWidth: 0 },
  cellBottom: { borderBottomWidth: 0 },
  metricLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  metricName: { ...Type.label, color: Colors.text2 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'nowrap', gap: 4 },
  valueLine: { minWidth: 0, flexDirection: 'row', alignItems: 'baseline', flexWrap: 'nowrap', gap: 4 },
  figure: { ...tabular, flexShrink: 1, minWidth: 0, fontFamily: 'Outfit_600SemiBold', fontSize: 30, lineHeight: 32, letterSpacing: -0.8, color: Colors.ink },
  unit: { flexShrink: 0, fontFamily: 'Outfit_500Medium', fontSize: 13, lineHeight: 18, color: Colors.text3 },
  copy: { gap: 4 },
  stateTitle: { fontFamily: 'Outfit_600SemiBold', fontSize: 20, lineHeight: 26, letterSpacing: -0.3, color: Colors.ink },
  caption: { fontFamily: 'Outfit_400Regular', fontSize: 13, lineHeight: 18, color: Colors.text3 },
  pill: {
    marginLeft: 'auto',
    alignSelf: 'center',
    height: 24,
    minWidth: 40,
    paddingHorizontal: 8,
    marginVertical: -4,
    borderRadius: 12,
    backgroundColor: Colors.waterSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pillText: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: Colors.water },
  track: { height: 3, borderRadius: 99, backgroundColor: Colors.track, overflow: 'hidden', marginTop: 'auto' },
  fill: { height: 3, borderRadius: 99 },
});

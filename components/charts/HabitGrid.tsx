import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { Type, tabular } from '../../constants/typography';
import { formatNumber } from '../../utils/format';

export type HabitCell = { on: boolean; today: boolean };

export type HabitRow = {
  name: string;
  color: string;
  rate: number;
  cells: HabitCell[];
};

type Props = {
  mode: 'week' | 'meter';
  days: string[];
  rows: HabitRow[];
};

export const HabitGrid = ({ mode, days, rows }: Props) => {
  if (mode === 'meter') {
    return (
      <View style={styles.meters}>
        {rows.map((row) => (
          <View key={row.name} style={styles.meterRow}>
            <Text numberOfLines={1} style={styles.meterName}>
              {row.name}
            </Text>
            <View style={styles.track} accessibilityLabel={`${row.name}, ${formatNumber(row.rate)} por ciento`}>
              <View style={[styles.fill, { width: `${row.rate}%`, backgroundColor: row.color }]} />
            </View>
            <Text style={styles.pct}>{formatNumber(row.rate)} %</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      <View style={styles.line}>
        <View style={styles.nameSlot} />
        {days.map((day, index) => (
          <Text key={`${day}-${index}`} style={[styles.day, rows.some((row) => row.cells[index]?.today) ? styles.dayToday : null]}>
            {day}
          </Text>
        ))}
        <View style={styles.pctSlot} />
      </View>
      {rows.map((row) => (
        <View key={row.name} style={styles.line}>
          <Text numberOfLines={1} style={styles.name}>
            {row.name}
          </Text>
          {row.cells.map((cell, index) => (
            <View
              key={index}
              accessibilityLabel={`${row.name}, ${days[index] ?? ''}, ${cell.on ? 'hecho' : 'pendiente'}`}
              style={[styles.cell, { backgroundColor: cell.on ? row.color : Colors.line }, cell.today ? styles.today : null, cell.today && cell.on ? styles.todayOn : null]}
            />
          ))}
          <Text style={styles.pct}>{formatNumber(row.rate)} %</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: { gap: 6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameSlot: { flex: 1 },
  name: { flex: 1, ...Type.body, fontSize: 14, lineHeight: 18, color: Colors.ink },
  day: { width: 22, textAlign: 'center', fontFamily: 'Outfit_600SemiBold', fontSize: 11, color: Colors.text4 },
  dayToday: { color: Colors.ink },
  cell: { width: 22, height: 22, borderRadius: 6 },
  today: { borderWidth: 1.5, borderColor: '#C4CAD3' },
  todayOn: { borderColor: 'rgba(255,255,255,0.7)' },
  pctSlot: { width: 44 },
  pct: { width: 44, textAlign: 'right', ...tabular, fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: Colors.text2 },
  meters: { gap: 12 },
  meterName: { width: 118, ...Type.body, fontSize: 14, lineHeight: 18, color: Colors.ink },
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: Colors.line, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
});

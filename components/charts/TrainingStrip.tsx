import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { ChartBar, ColumnChart } from './ColumnChart';

export type TrainDay = { label: string; tag: string; accessibilityLabel: string };

type Props = {
  mode: 'week' | 'bars';
  days: TrainDay[];
  bars: ChartBar[];
  animateKey: string;
};

export const TrainingStrip = ({ mode, days, bars, animateKey }: Props) => {
  if (mode === 'bars') {
    return <ColumnChart bars={bars} color={Colors.workout} animateKey={animateKey} />;
  }

  return (
    <View style={styles.row}>
      {days.map((day, index) => (
        <View key={`${day.label}-${index}`} accessibilityLabel={day.accessibilityLabel} style={styles.day}>
          <View style={[styles.circle, day.tag ? styles.circleOn : null]}>
            <Text style={[styles.tag, day.tag ? styles.tagOn : null]}>{day.tag}</Text>
          </View>
          <Text style={styles.letter}>{day.label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  day: { flex: 1, alignItems: 'center', gap: 6 },
  circle: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center' },
  circleOn: { backgroundColor: Colors.workoutSoft },
  tag: { fontFamily: 'Outfit_600SemiBold', fontSize: 11, color: Colors.fill },
  tagOn: { color: '#B4471A' },
  letter: { fontFamily: 'Outfit_600SemiBold', fontSize: 11, color: Colors.text3 },
});

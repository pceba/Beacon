import React from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  value: number;
  color: string;
  track: string;
};

export const ProgressBar = ({ value, color, track }: Props) => {
  const width = `${Math.round(Math.min(Math.max(value, 0), 1) * 100)}%` as const;
  return (
    <View style={[styles.track, { backgroundColor: track }]}>
      <View style={[styles.fill, { width, backgroundColor: color }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: 99, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 99 },
});

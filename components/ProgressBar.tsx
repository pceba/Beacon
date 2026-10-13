import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';
import { Radius, Spacing } from '../constants/spacing';
import { Typography } from '../constants/typography';

interface Props {
  current: number;
  total: number;
  color?: string;
}

export const ProgressBar = ({ current, total, color = Colors.habit }: Props) => {
  const pct = Math.max(0, Math.min(100, (current / Math.max(total, 1)) * 100));
  return (
    <View style={styles.wrapper}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.label}>
        {current} / {total}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.xs },
  track: { height: 10, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.full },
  label: { alignSelf: 'flex-end', color: Colors.textMuted, fontFamily: Typography.fontRegular, fontSize: Typography.xs },
});

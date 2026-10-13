import React from 'react';
import { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';

interface Props {
  label: string;
  value: string;
  icon?: LucideIcon;
  trend?: string;
}

export const StatRow = ({ label, value, icon: Icon, trend }: Props) => (
  <View style={styles.row}>
    <View style={styles.left}>
      {Icon ? <Icon size={16} color={Colors.brownLight} /> : null}
      <Text style={styles.label}>{label}</Text>
    </View>
    <Text style={styles.value}>
      {value}
      {trend ? `  ${trend}` : ''}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: Colors.textSecondary, fontFamily: Typography.fontRegular, fontSize: Typography.md },
  value: { color: Colors.textPrimary, fontFamily: Typography.fontBold, fontSize: Typography.md },
});

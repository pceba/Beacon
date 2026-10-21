import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { Colors } from '../../../constants/colors';
import { Spacing } from '../../../constants/spacing';
import { Type } from '../../../constants/typography';

// Error de un campo con el aspecto de InlineError, sin «Reintentar».
export const FieldError = ({ title }: { title: string }) => (
  <View accessibilityLiveRegion="polite" style={styles.row}>
    <View style={styles.icon}>
      <AlertCircle color={Colors.danger} size={16} />
    </View>
    <Text style={styles.text}>{title}</Text>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  icon: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  text: { ...Type.bodyStrong, color: Colors.danger },
});

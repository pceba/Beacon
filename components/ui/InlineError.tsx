import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Type } from '../../constants/typography';
import { Button } from './Button';

type Props = { title: string; body: string; onRetry: () => void };

export const InlineError = ({ title, body, onRetry }: Props) => (
  <View style={styles.wrap}>
    <View style={styles.icon}>
      <AlertCircle color={Colors.danger} size={16} />
    </View>
    <View style={styles.copy}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
    <Button title="Reintentar" variant="outline" size="md" onPress={onRetry} />
  </View>
);

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md, paddingVertical: Spacing.md },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { gap: 4 },
  title: { ...Type.bodyStrong, color: Colors.ink },
  body: { ...Type.caption, color: Colors.text2 },
});

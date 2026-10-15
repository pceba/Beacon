import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Type } from '../../constants/typography';
import { Button } from './Button';

type Props = {
  icon: React.ComponentType<{ size: number; color: string }>;
  color?: string;
  soft?: string;
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
};

export const EmptyState = ({ icon: Icon, color = Colors.accent, soft = Colors.accentSoft, title, body, action }: Props) => (
  <View style={styles.wrap}>
    <View style={[styles.circle, { backgroundColor: soft }]}>
      <Icon color={color} size={22} />
    </View>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.body}>{body}</Text>
    {action ? <Button title={action.label} size="md" onPress={action.onPress} /> : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl, paddingHorizontal: Spacing.lg },
  circle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { ...Type.section, color: Colors.ink, textAlign: 'center' },
  body: { ...Type.caption, color: Colors.text3, textAlign: 'center' },
});

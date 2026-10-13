import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';
import { Spacing } from '../constants/spacing';
import { Typography } from '../constants/typography';

interface Props {
  title: string;
  action?: { label: string; onPress: () => void };
}

export const SectionHeader = ({ title, action }: Props) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    {action ? (
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={action.onPress}
        style={({ pressed }) => [pressed ? styles.pressed : null]}
      >
        <Text style={styles.action}>{action.label}</Text>
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 28,
    marginBottom: 4,
  },
  title: {
    flex: 1,
    minWidth: 0,
    color: Colors.textPrimary,
    fontFamily: Typography.fontBold,
    fontSize: Typography.md,
  },
  action: { color: Colors.gold, fontFamily: Typography.fontBold, fontSize: Typography.sm },
  pressed: { opacity: 0.7 },
});

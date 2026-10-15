import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { Radius, Spacing } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { PressableScale } from './PressableScale';

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  action?: { label: string; onPress: () => void };
}

export const EmptyState = ({ icon: Icon, title, subtitle, action }: Props) => (
  <View style={styles.container}>
    <View style={styles.iconWrap}>
      <Icon size={22} color={Colors.text2} />
    </View>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
    {action ? (
      <PressableScale onPress={action.onPress} style={styles.action}>
        <Text style={styles.actionText}>{action.label}</Text>
      </PressableScale>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm, paddingHorizontal: Spacing.md },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.fill,
  },
  title: { color: Colors.ink, fontFamily: Typography.fontDisplay, fontSize: Typography.lg, textAlign: 'center' },
  subtitle: { color: Colors.text2, fontFamily: Typography.fontRegular, fontSize: Typography.sm, textAlign: 'center', lineHeight: 20 },
  action: {
    marginTop: Spacing.sm,
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: Colors.surface, fontFamily: Typography.fontBold, fontSize: Typography.sm },
});

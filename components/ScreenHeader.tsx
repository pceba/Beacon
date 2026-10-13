import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Settings } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { Radius, Spacing } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { PressableScale } from './PressableScale';

type Props = {
  kicker?: string;
  title: string;
  subtitle?: string;
  onSettings?: () => void;
  action?: { label: string; onPress: () => void };
};

export const ScreenHeader = ({ kicker, title, subtitle, onSettings, action }: Props) => (
  <View style={styles.row}>
    <View style={styles.copy}>
      {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
    {action ? (
      <PressableScale accessibilityLabel={action.label} hitSlop={8} onPress={action.onPress} style={styles.action}>
        <Text style={styles.actionText}>{action.label}</Text>
      </PressableScale>
    ) : null}
    {onSettings ? (
      <PressableScale accessibilityLabel="Ajustes" hitSlop={8} onPress={onSettings} style={styles.button}>
        <Settings color={Colors.brownPrimary} size={18} />
      </PressableScale>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, minHeight: 44 },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  kicker: {
    fontFamily: Typography.fontMedium,
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  title: {
    fontFamily: Typography.fontBold,
    fontSize: 24,
    lineHeight: 30,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Typography.fontRegular,
    fontSize: Typography.sm,
    lineHeight: 20,
    color: Colors.textMuted,
  },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  actionText: { fontFamily: Typography.fontBold, fontSize: Typography.sm, color: Colors.gold },
  button: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
});

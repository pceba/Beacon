import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Settings } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Type } from '../../constants/typography';

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
      <Pressable accessibilityRole="button" accessibilityLabel={action.label} hitSlop={8} onPress={action.onPress} style={styles.action}>
        <Text style={styles.actionText}>{action.label}</Text>
      </Pressable>
    ) : null}
    {onSettings ? (
      <Pressable accessibilityRole="button" accessibilityLabel="Ajustes" hitSlop={8} onPress={onSettings} style={styles.button}>
        <Settings color={Colors.ink} size={18} />
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, minHeight: 44 },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  kicker: { ...Type.caption, color: Colors.text3 },
  title: { ...Type.headline, fontSize: 24, lineHeight: 30, color: Colors.ink },
  subtitle: { ...Type.caption, color: Colors.text3 },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  actionText: { ...Type.bodyStrong, fontSize: 14, color: Colors.accent },
  button: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.line,
  },
});

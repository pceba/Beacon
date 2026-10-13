import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';
import { Spacing } from '../constants/spacing';
import { Typography } from '../constants/typography';

type Props = {
  icon: React.ComponentType<{ size: number; color: string }>;
  tint: string;
  label: string;
  hint?: string;
  value?: string;
  progress?: number;
  onPress?: () => void;
  trailing?: React.ReactNode;
  last?: boolean;
};

export const LineRow = ({ icon: Icon, tint, label, hint, value, progress, onPress, trailing, last }: Props) => {
  const body = (
    <>
      <View style={[styles.icon, { backgroundColor: `${tint}18` }]}>
        <Icon size={16} color={tint} />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.label}>
          {label}
        </Text>
        {hint ? (
          <Text numberOfLines={1} style={styles.hint}>
            {hint}
          </Text>
        ) : null}
        {typeof progress === 'number' && progress > 0 ? (
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${Math.round(Math.min(Math.max(progress, 0), 1) * 100)}%`, backgroundColor: tint },
              ]}
            />
          </View>
        ) : null}
      </View>
      {value ? (
        <Text numberOfLines={1} style={styles.value}>
          {value}
        </Text>
      ) : null}
      {trailing ? <View style={styles.trail}>{trailing}</View> : null}
    </>
  );

  const row = [styles.row, last ? styles.last : null];
  if (!onPress) return <View style={row}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={onPress}
      style={({ pressed }) => [row, pressed ? styles.pressed : null]}
    >
      {body}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.hairline,
  },
  last: { borderBottomWidth: 0, paddingBottom: 2 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  label: { fontFamily: Typography.fontBold, fontSize: Typography.md, color: Colors.textPrimary },
  hint: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, color: Colors.textMuted },
  value: {
    flexShrink: 0,
    textAlign: 'right',
    fontFamily: Typography.fontBold,
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },
  trail: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  track: { height: 4, borderRadius: 99, backgroundColor: Colors.surfaceAlt, marginTop: 6, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 99 },
  pressed: { opacity: 0.72 },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { Spacing } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { PressableScale } from './PressableScale';

type Props = {
  title: string;
  meta?: string;
  done: boolean;
  onPress: () => void;
  emphasis?: string;
};

export const CheckRow = ({ title, meta, done, onPress, emphasis }: Props) => (
  <PressableScale accessibilityLabel={`${title}, ${done ? 'hecha' : 'pendiente'}`} onPress={onPress} style={styles.row}>
    <View style={[styles.box, done ? styles.boxDone : null]}>
      {done ? <Check color={Colors.white} size={14} strokeWidth={2.8} /> : null}
    </View>
    <View style={styles.copy}>
      <Text numberOfLines={2} style={[styles.title, done ? styles.titleDone : null]}>
        {title}
      </Text>
      {meta ? (
        <Text numberOfLines={1} style={styles.meta}>
          {meta}
        </Text>
      ) : null}
    </View>
    {emphasis ? <Text style={styles.emphasis}>{emphasis}</Text> : null}
  </PressableScale>
);

const styles = StyleSheet.create({
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 6 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.brownLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  boxDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontFamily: Typography.fontMedium, fontSize: Typography.md, color: Colors.textPrimary },
  titleDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  meta: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, color: Colors.textMuted },
  emphasis: { fontFamily: Typography.fontBold, fontSize: Typography.xs, letterSpacing: 0.8, color: Colors.task },
});

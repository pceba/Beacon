import React, { memo, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from '../../../components/PressableScale';
import { Colors } from '../../../constants/colors';
import { Spacing } from '../../../constants/spacing';
import { Type, tabular } from '../../../constants/typography';
import { HistoryItem } from '../../../services/workoutService';
import { historyMeta, weekdayDayMonth } from '../labels';

type Props = { item: HistoryItem; onOpen: (id: string) => void };

export const HISTORY_ROW_HEIGHT = 64;

// «jue 16 oct · Pierna» a la izquierda y «52 min · 4.250 kg» a la derecha.
export const HistoryRow = memo(({ item, onOpen }: Props) => {
  const open = useCallback(() => onOpen(item.id), [item.id, onOpen]);
  const meta = historyMeta(item.duration_minutes, item.volumeKg);
  const date = weekdayDayMonth(item.started_at);
  return (
    <PressableScale accessibilityLabel={`${item.name}, ${date}, ${meta}`} onPress={open} style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.date}>{date}</Text>
        <Text numberOfLines={1} style={styles.name}>
          {item.name}
        </Text>
      </View>
      <Text style={styles.meta}>{meta}</Text>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  row: {
    height: HISTORY_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.s16,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.line,
  },
  copy: { flex: 1, gap: 2 },
  date: { ...Type.caption, color: Colors.text3 },
  name: { ...Type.bodyStrong, color: Colors.ink },
  meta: { ...Type.caption, ...tabular, color: Colors.text2 },
});

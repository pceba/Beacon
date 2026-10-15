import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/spacing';
import { Type, tabular } from '../../constants/typography';
import { selection } from '../../lib/haptics';

type Props = {
  value: string;
  onChange: (value: string) => void;
  label: string;
};

const toDate = (value: string) => {
  const [hour, minute] = value.split(':').map((part) => Number(part));
  const date = new Date();
  date.setHours(Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0, 0, 0);
  return date;
};

const toTime = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

export const TimePill = ({ value, onChange, label }: Props) => {
  const [open, setOpen] = useState(false);

  const onPick = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'ios') {
      if (date) {
        selection();
        onChange(toTime(date));
      }
      return;
    }
    if (event.type === 'dismissed' || !date) return;
    selection();
    onChange(toTime(date));
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value}`}
        onPress={() => setOpen((current) => !current)}
        style={styles.pill}
      >
        <Text maxFontSizeMultiplier={1.3} style={styles.time}>
          {value}
        </Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          value={toDate(value)}
          onChange={onPick}
        />
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  pill: {
    minWidth: 72,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: { ...Type.bodyStrong, ...tabular, color: Colors.ink },
});

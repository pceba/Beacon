import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { TimePill } from '../../../components/ui/TimePill';
import { Colors } from '../../../constants/colors';
import { Radius } from '../../../constants/spacing';
import { Type, tabular } from '../../../constants/typography';
import { selection } from '../../../lib/haptics';
import { fromKey, keyOf } from '../../../utils/dates';
import { formatNumber } from '../../../utils/format';
import { weekdayName } from '../../../utils/labels';

type Props = { value: string; onChange: (value: string) => void; label: string };

const SHORT_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const dateLabel = (key: string) => {
  const date = fromKey(key);
  const year = date.getFullYear() === new Date().getFullYear() ? '' : ` ${date.getFullYear()}`;
  return `${weekdayName(date).slice(0, 3)} ${formatNumber(date.getDate())} ${SHORT_MONTHS[date.getMonth()]}${year}`;
};

// En web el selector nativo no existe: se usa el <input> del navegador con el mismo aspecto.
const WebInput = ({ type, value, onChange, label }: Props & { type: 'date' | 'time' }) =>
  React.createElement('input', {
    type,
    value,
    'aria-label': label,
    onChange: (event: { target: { value: string } }) => {
      if (event.target.value) onChange(event.target.value);
    },
    style: {
      minHeight: 44,
      minWidth: type === 'time' ? 96 : 150,
      padding: '0 12px',
      border: 0,
      borderRadius: Radius.pill,
      backgroundColor: Colors.bg,
      color: Colors.ink,
      fontFamily: Type.bodyStrong.fontFamily,
      fontSize: 16,
      fontVariantNumeric: 'tabular-nums',
      boxSizing: 'border-box',
    },
  });

// Hora 24 h: el TimePill de la app; en web, el campo de hora del navegador.
export const TimeField = (props: Props) => (Platform.OS === 'web' ? <WebInput type="time" {...props} /> : <TimePill {...props} />);

// Fecha con el mismo aspecto que TimePill. Nunca se escribe a mano.
export const DateField = ({ value, onChange, label }: Props) => {
  const [open, setOpen] = useState(false);
  if (Platform.OS === 'web') return <WebInput type="date" value={value} onChange={onChange} label={label} />;

  const onPick = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') setOpen(false);
    if (event.type === 'dismissed' || !date) return;
    selection();
    onChange(keyOf(date));
  };

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${dateLabel(value)}`} onPress={() => setOpen((current) => !current)} style={styles.pill}>
        <Text maxFontSizeMultiplier={1.3} style={styles.text}>
          {dateLabel(value)}
        </Text>
      </Pressable>
      {open ? <DateTimePicker mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'} value={fromKey(value)} onChange={onPick} /> : null}
    </>
  );
};

const styles = StyleSheet.create({
  pill: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { ...Type.bodyStrong, ...tabular, color: Colors.ink },
});

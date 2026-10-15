import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { FormScreen } from '../../components/ui/FormScreen';
import { Segmented } from '../../components/ui/Segmented';
import { TextField } from '../../components/ui/TextField';
import { TimePill } from '../../components/ui/TimePill';
import { Colors } from '../../constants/colors';
import { Type } from '../../constants/typography';
import { toast } from '../../lib/toast';
import { getCurrentUserId } from '../../services/authService';
import { createSleepLog, getSleepLogs, updateSleepLog } from '../../services/sleepService';
import { LogStackParamList } from '../../types/navigation';
import { formatDuration } from '../../utils/format';
import { finishLog, useReturnToToday } from '../../utils/finishLog';
import { MOODS } from '../../utils/mood';

type Route = RouteProp<LogStackParamList, 'LogSleepScreen'>;
type Quality = '1' | '2' | '3' | '4' | '5';

const clock = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

const minutesOf = (value: string) => {
  const [hour, minute] = value.split(':').map((part) => Number(part));
  return (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0);
};

const atClock = (base: Date, value: string) => {
  const next = new Date(base);
  const total = minutesOf(value);
  next.setHours(Math.floor(total / 60), total % 60, 0, 0);
  return next;
};

export const LogSleepScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  useReturnToToday(route.params?.fromToday);
  const [bed, setBed] = useState('23:30');
  const [wake, setWake] = useState('07:15');
  const [quality, setQuality] = useState<Quality>('3');
  const [notes, setNotes] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadEdit = async () => {
      if (!route.params?.sleepId) return;
      try {
        const userId = await getCurrentUserId();
        const selected = (await getSleepLogs(userId)).find((row) => row.id === route.params?.sleepId);
        if (!selected) return;
        setBed(clock(new Date(selected.bed_time)));
        setWake(clock(new Date(selected.wake_time)));
        const score = selected.quality_rating;
        if (score && score >= 1 && score <= 5) setQuality(String(score) as Quality);
        setNotes(selected.notes ?? '');
        if (selected.notes) setNoteOpen(true);
      } catch (error) {
        console.error(error);
      }
    };
    void loadEdit();
  }, [route.params?.sleepId]);

  const hours = useMemo(() => {
    const start = minutesOf(bed);
    let end = minutesOf(wake);
    if (end <= start) end += 24 * 60;
    return (end - start) / 60;
  }, [bed, wake]);

  const onSubmit = async () => {
    setSaving(true);
    try {
      const userId = await getCurrentUserId();
      const bedDate = atClock(new Date(), bed);
      const wakeDate = atClock(bedDate, wake);
      if (minutesOf(wake) <= minutesOf(bed)) wakeDate.setDate(wakeDate.getDate() + 1);
      const payload = {
        bed_time: bedDate.toISOString(),
        wake_time: wakeDate.toISOString(),
        quality_rating: Number(quality),
        notes: notes.trim() || null,
      };
      if (route.params?.sleepId) await updateSleepLog(userId, route.params.sleepId, payload);
      else await createSleepLog(userId, payload);
      finishLog(navigation, route.params?.fromToday);
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha guardado', kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen title="Sueño" saveLabel="Guardar sueño" onSave={() => void onSubmit()} loading={saving}>
      <Text style={styles.duration}>{formatDuration(hours)}</Text>
      <Text style={styles.hint}>Si te levantas más tarde del reloj de acostarte, cuenta como el día siguiente.</Text>
      <ViewRow label="Acostarse">
        <TimePill label="Acostarse" value={bed} onChange={setBed} />
      </ViewRow>
      <ViewRow label="Levantarse">
        <TimePill label="Levantarse" value={wake} onChange={setWake} />
      </ViewRow>
      <Text style={styles.caption}>Calidad</Text>
      <Segmented
        value={quality}
        onChange={setQuality}
        options={MOODS.map((mood) => ({ value: String(mood.score) as Quality, label: mood.label }))}
      />
      <Pressable accessibilityRole="button" accessibilityLabel={noteOpen ? 'Ocultar nota' : 'Añadir nota'} onPress={() => setNoteOpen((open) => !open)}>
        <Text style={styles.link}>{noteOpen ? 'Ocultar nota' : 'Añadir nota'}</Text>
      </Pressable>
      {noteOpen ? <TextField label="Nota" value={notes} onChangeText={setNotes} placeholder="Opcional" multiline /> : null}
    </FormScreen>
  );
};

const ViewRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  duration: { ...Type.headline, color: Colors.ink },
  hint: { ...Type.caption, color: Colors.text3, marginTop: -4 },
  caption: { ...Type.caption, color: Colors.text3 },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { ...Type.body, color: Colors.ink },
  link: { ...Type.bodyStrong, color: Colors.accent, minHeight: 44 },
});

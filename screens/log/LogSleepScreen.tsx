import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { differenceInMinutes } from 'date-fns';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { StarRating } from '../../components/StarRating';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { getCurrentUserId } from '../../services/authService';
import { createSleepLog, getSleepLogs, updateSleepLog } from '../../services/sleepService';
import { LogStackParamList } from '../../types/navigation';
import { finishLog, useReturnToToday } from '../../utils/finishLog';

type Route = RouteProp<LogStackParamList, 'LogSleepScreen'>;

const pad = (value: number) => String(value).padStart(2, '0');

const stampFromDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

const defaultBed = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  date.setHours(23, 0, 0, 0);
  return stampFromDate(date);
};

const defaultWake = () => {
  const date = new Date();
  date.setHours(7, 0, 0, 0);
  return stampFromDate(date);
};

const toIso = (stamp: string) => {
  const match = stamp.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

export const LogSleepScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  useReturnToToday(route.params?.fromToday);
  const [bedTime, setBedTime] = useState(defaultBed);
  const [wakeTime, setWakeTime] = useState(defaultWake);
  const [quality, setQuality] = useState(3);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const loadEdit = async () => {
      if (!route.params?.sleepId) return;
      try {
        const userId = await getCurrentUserId();
        const rows = await getSleepLogs(userId);
        const selected = rows.find((row) => row.id === route.params?.sleepId);
        if (!selected) return;
        setBedTime(stampFromDate(new Date(selected.bed_time)));
        setWakeTime(stampFromDate(new Date(selected.wake_time)));
        setQuality(selected.quality_rating ?? 3);
        setNotes(selected.notes ?? '');
      } catch (error) {
        console.error(error);
      }
    };
    loadEdit();
  }, [route.params?.sleepId]);

  const bedIso = toIso(bedTime);
  const wakeIso = toIso(wakeTime);
  const hours = useMemo(
    () => (bedIso && wakeIso ? Math.max(0, differenceInMinutes(new Date(wakeIso), new Date(bedIso)) / 60) : 0),
    [bedIso, wakeIso],
  );

  const onSubmit = async () => {
    if (!bedIso || !wakeIso) {
      Alert.alert('Usa el formato aaaa-mm-dd hh:mm');
      return;
    }
    try {
      const userId = await getCurrentUserId();
      const payload = { bed_time: bedIso, wake_time: wakeIso, quality_rating: quality, notes: notes || null };
      if (route.params?.sleepId) await updateSleepLog(userId, route.params.sleepId, payload);
      else await createSleepLog(userId, payload);
      finishLog(navigation, route.params?.fromToday);
    } catch (error) {
      console.error(error);
      Alert.alert('No se ha guardado');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <Input label="Acostarse" value={bedTime} onChangeText={setBedTime} />
        <Input label="Levantarse" value={wakeTime} onChangeText={setWakeTime} />
        <Text style={styles.info}>{hours.toFixed(1)} h</Text>
        <StarRating value={quality} onChange={setQuality} />
        <Input label="Notas" value={notes} onChangeText={setNotes} multiline numberOfLines={6} />
        <Button title={route.params?.sleepId ? 'Actualizar' : 'Guardar'} onPress={onSubmit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  info: { color: Colors.textSecondary, fontFamily: Typography.fontRegular, fontSize: Typography.md },
});

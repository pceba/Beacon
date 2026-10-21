import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '../../lib/toast';
import { StyleSheet, Text } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { TextField } from '../../components/ui/TextField';
import { FormScreen } from '../../components/ui/FormScreen';
import { Card } from '../../components/ui/Card';
import { Colors } from '../../constants/colors';
import { Type } from '../../constants/typography';
import { invalidateTables } from '../../lib/query';
import { getCurrentUserId } from '../../services/authService';
import { createBodyMetric, getBodyMetrics, updateBodyMetric } from '../../services/bodyMetricsService';
import { LogStackParamList } from '../../types/navigation';
import { keyOf } from '../../utils/dates';
import { formatFlexible } from '../../utils/format';

type Route = RouteProp<LogStackParamList, 'LogBodyScreen'>;

export const LogBodyScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const metricId = route.params?.metricId;
  const [date, setDate] = useState(() => keyOf(new Date()));
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [notes, setNotes] = useState('');

  // Tabla pequeña: se lee entera para el historial y la fila que se edita.
  const metrics = useQuery({
    queryKey: ['body_metrics'],
    queryFn: async () => getBodyMetrics(await getCurrentUserId()),
  });
  const history = useMemo(() => (metrics.data ?? []).slice(0, 5), [metrics.data]);

  useEffect(() => {
    if (metrics.error) console.error(metrics.error);
  }, [metrics.error]);

  // Se rellena una sola vez: una recarga no debe pisar lo que ya se ha cambiado.
  const filled = useRef(false);
  useEffect(() => {
    if (!metricId || filled.current) return;
    const item = metrics.data?.find((row) => row.id === metricId);
    if (!item) return;
    filled.current = true;
    setDate(item.date);
    setWeight(String(item.weight_kg ?? ''));
    setBodyFat(String(item.body_fat_pct ?? ''));
    setNotes(item.notes ?? '');
  }, [metricId, metrics.data]);

  const onSubmit = async () => {
    try {
      const userId = await getCurrentUserId();
      const payload = { date, weight_kg: Number(weight || 0), body_fat_pct: Number(bodyFat || 0), notes: notes || null };
      if (metricId) await updateBodyMetric(userId, metricId, payload);
      else await createBodyMetric(userId, payload);
      void invalidateTables('body_metrics');
      navigation.goBack();
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha guardado', kind: 'error' });
    }
  };

  return (
    <FormScreen title="Peso" saveLabel="Guardar peso" onSave={() => void onSubmit()}>
      <TextField label="Fecha" value={date} onChangeText={setDate} />
      <TextField label="Peso (kg)" value={weight} onChangeText={setWeight} keyboardType="numeric" />
      <TextField label="Grasa (%)" value={bodyFat} onChangeText={setBodyFat} keyboardType="numeric" />
      <TextField label="Notas" value={notes} onChangeText={setNotes} multiline numberOfLines={4} />
      <Text style={styles.header}>Últimos registros</Text>
      {history.map((item) => (
        <Card key={item.id}>
          <Text style={styles.item}>
            {item.date} · {item.weight_kg != null ? `${formatFlexible(item.weight_kg, 1)} kg` : '—'}
          </Text>
        </Card>
      ))}
    </FormScreen>
  );
};

const styles = StyleSheet.create({
  header: { ...Type.bodyStrong, color: Colors.ink },
  item: { ...Type.body, color: Colors.ink },
});

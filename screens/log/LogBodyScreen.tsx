import React, { useEffect, useState } from 'react';
import { toast } from '../../lib/toast';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { TextField } from '../../components/ui/TextField';
import { FormScreen } from '../../components/ui/FormScreen';
import { Card } from '../../components/ui/Card';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { getCurrentUserId } from '../../services/authService';
import { createBodyMetric, getBodyMetrics, updateBodyMetric } from '../../services/bodyMetricsService';
import { BodyMetric } from '../../types/database';
import { LogStackParamList } from '../../types/navigation';
import { formatFlexible } from '../../utils/format';

type Route = RouteProp<LogStackParamList, 'LogBodyScreen'>;

export const LogBodyScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [notes, setNotes] = useState('');
  const [history, setHistory] = useState<BodyMetric[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const userId = await getCurrentUserId();
        const rows = await getBodyMetrics(userId);
        setHistory(rows.slice(0, 5));
        if (route.params?.metricId) {
          const item = rows.find((row) => row.id === route.params?.metricId);
          if (item) {
            setDate(item.date);
            setWeight(String(item.weight_kg ?? ''));
            setBodyFat(String(item.body_fat_pct ?? ''));
            setNotes(item.notes ?? '');
          }
        }
      } catch (error) {
        console.error(error);
      }
    };
    load();
  }, [route.params?.metricId]);

  const onSubmit = async () => {
    try {
      const userId = await getCurrentUserId();
      const payload = { date, weight_kg: Number(weight || 0), body_fat_pct: Number(bodyFat || 0), notes: notes || null };
      if (route.params?.metricId) await updateBodyMetric(userId, route.params.metricId, payload);
      else await createBodyMetric(userId, payload);
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
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  header: { color: Colors.ink, fontFamily: Typography.fontBold, fontSize: Typography.md },
  item: { color: Colors.ink, fontFamily: Typography.fontRegular, fontSize: Typography.md },
});

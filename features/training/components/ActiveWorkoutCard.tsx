import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Colors } from '../../../constants/colors';
import { Spacing } from '../../../constants/spacing';
import { Type, tabular } from '../../../constants/typography';
import { Workout } from '../../../types/database';
import { formatNumber } from '../../../utils/format';
import { useMinuteTick } from '../hooks/useMinuteTick';
import { minutesSince } from '../numbers';

type Props = { workout: Workout; onContinue: () => void; onDiscard: () => void };

// Empezar con un entreno en curso: «Pierna · 23 min», Continuar y Descartar.
export const ActiveWorkoutCard = memo(({ workout, onContinue, onDiscard }: Props) => {
  const now = useMinuteTick();
  const minutes = minutesSince(workout.started_at, now);

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.dot} />
        <Text numberOfLines={1} style={styles.title}>
          {workout.name} · <Text style={styles.minutes}>{formatNumber(minutes)} min</Text>
        </Text>
      </View>
      <Text style={styles.caption}>Entreno en curso</Text>
      <Button title="Continuar" onPress={onContinue} />
      <Pressable accessibilityRole="button" accessibilityLabel="Descartar entreno en curso" onPress={onDiscard} style={styles.discard}>
        <Text style={styles.discardText}>Descartar</Text>
      </Pressable>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.workout },
  title: { ...Type.section, color: Colors.ink, flex: 1 },
  minutes: { ...tabular },
  caption: { ...Type.caption, color: Colors.text3, marginBottom: Spacing.xs },
  discard: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  discardText: { ...Type.bodyStrong, color: Colors.danger },
});

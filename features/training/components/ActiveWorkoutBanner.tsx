import React, { memo, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from '../../../components/PressableScale';
import { Colors } from '../../../constants/colors';
import { cardShadow, Radius, Spacing } from '../../../constants/spacing';
import { Type, tabular } from '../../../constants/typography';
import { formatNumber } from '../../../utils/format';
import { useActiveWorkout } from '../hooks/useActiveWorkout';
import { useMinuteTick } from '../hooks/useMinuteTick';
import { openWorkout } from '../navigation';
import { minutesSince } from '../numbers';

const Minutes = memo(({ startedAt }: { startedAt: string }) => {
  const now = useMinuteTick();
  return <Text style={styles.minutes}>{formatNumber(minutesSince(startedAt, now))} min</Text>;
});

// Hoy: tarjeta de 48 «Entreno en curso · 23 min» + «Continuar». Nada si no hay entreno en curso.
export const ActiveWorkoutBanner = memo(() => {
  const workout = useActiveWorkout();
  const id = workout?.id;
  const open = useCallback(() => {
    if (id) openWorkout(id, 'live', true);
  }, [id]);
  if (!workout) return null;

  return (
    <PressableScale accessibilityLabel="Entreno en curso. Continuar" onPress={open} style={styles.card}>
      <View style={styles.dot} />
      <Text numberOfLines={1} style={styles.text}>
        Entreno en curso · <Minutes startedAt={workout.started_at} />
      </Text>
      <Text style={styles.action}>Continuar</Text>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  card: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.s16,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    ...cardShadow,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.workout },
  text: { ...Type.body, color: Colors.ink, flex: 1 },
  minutes: { ...tabular },
  action: { ...Type.bodyStrong, color: Colors.accent },
});

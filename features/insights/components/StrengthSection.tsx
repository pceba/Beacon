import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Sparkline } from '../../../components/charts/Sparkline';
import { Card } from '../../../components/ui/Card';
import { DeltaPill } from '../../../components/ui/DeltaPill';
import { Colors } from '../../../constants/colors';
import { Type, tabular } from '../../../constants/typography';
import { ExerciseSummary } from '../../../utils/exerciseProgress';
import { formatFlexible } from '../../../utils/format';
import { insightsStyles as shared } from './insightsStyles';

type Props = { exercises: ExerciseSummary[] | null; onOpen: (exerciseKey: string) => void };

export const StrengthSection = memo(({ exercises, onOpen }: Props) => (
  <Card style={shared.sectionCard}>
    <View style={shared.sectionHead}>
      <Text style={shared.section}>Fuerza</Text>
    </View>
    {!exercises ? null : exercises.length === 0 ? (
      <Text style={shared.empty}>Registra un ejercicio con peso en dos entrenos para ver tu progreso.</Text>
    ) : (
      exercises.map((exercise) => <StrengthRow key={exercise.key} exercise={exercise} onOpen={onOpen} />)
    )}
  </Card>
));

const StrengthRow = memo(({ exercise, onOpen }: { exercise: ExerciseSummary; onOpen: (exerciseKey: string) => void }) => {
  const open = useCallback(() => onOpen(exercise.key), [exercise.key, onOpen]);
  const spark = useMemo(() => exercise.series.map((session) => session.e1rm), [exercise.series]);
  const delta = exercise.change4w;
  const flat = delta == null || Math.abs(delta) < 0.05;
  const best = exercise.bestE1rm ? formatFlexible(exercise.bestE1rm.value, 1) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${exercise.name}, mejor 1RM ${best ?? 'sin dato'} kilogramos`}
      onPress={open}
      style={styles.row}
    >
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.name}>
          {exercise.name}
        </Text>
        <Text style={styles.best}>{best ? `${best} kg` : '—'}</Text>
      </View>
      <Sparkline values={spark} color={Colors.workout} style={styles.spark} />
      {delta == null ? null : <DeltaPill delta={flat ? 0 : delta} label={flat ? 'igual' : `${delta < 0 ? '−' : ''}${formatFlexible(Math.abs(delta), 1)} kg`} />}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.line },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  name: { ...Type.body, color: Colors.ink },
  best: { ...tabular, fontFamily: 'Outfit_600SemiBold', fontSize: 15, color: Colors.ink },
  spark: { width: 88 },
});

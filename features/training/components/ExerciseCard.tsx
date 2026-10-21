import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, MoreHorizontal, Plus } from 'lucide-react-native';
import { Card } from '../../../components/ui/Card';
import { Colors } from '../../../constants/colors';
import { Spacing } from '../../../constants/spacing';
import { Type } from '../../../constants/typography';
import { formatLastTime, LoggedSet } from '../../../utils/exerciseProgress';
import { anteriorRows, NO_ANTERIOR, prSetIds } from '../sessionMath';
import { ExerciseDraft } from '../sessionReducer';
import { SET_COLUMNS, SetRow, SetRowHandlers } from './SetRow';

export type ExerciseHandlers = SetRowHandlers & {
  onAddSet: (exerciseId: string) => void;
  onExerciseMenu: (exerciseId: string) => void;
};

type Props = {
  exercise: ExerciseDraft;
  previous: LoggedSet[] | null;
  best: number | null;
  handlers: ExerciseHandlers;
};

export const ExerciseCard = memo(({ exercise, previous, best, handlers }: Props) => {
  const anteriors = useMemo(() => anteriorRows(previous), [previous]);
  const lastTime = useMemo(() => formatLastTime(previous ?? []), [previous]);
  const prIds = useMemo(() => new Set(prSetIds(exercise.sets, best)), [best, exercise.sets]);
  const onAddSet = useCallback(() => handlers.onAddSet(exercise.id), [exercise.id, handlers]);
  const onMenu = useCallback(() => handlers.onExerciseMenu(exercise.id), [exercise.id, handlers]);

  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={2}>
          {exercise.name}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Opciones de ${exercise.name}`} onPress={onMenu} style={styles.more}>
          <MoreHorizontal color={Colors.text3} size={20} />
        </Pressable>
      </View>
      {exercise.notes ? <Text style={styles.notes}>{exercise.notes}</Text> : null}
      {lastTime ? <Text style={styles.last}>{lastTime}</Text> : null}
      <View style={styles.header}>
        <Text style={[styles.label, styles.serie]}>Serie</Text>
        <Text style={[styles.label, styles.anterior]}>Anterior</Text>
        <Text style={[styles.label, styles.kg]}>Kg</Text>
        <Text style={[styles.label, styles.reps]}>Reps</Text>
        <View style={styles.check}>
          <Check color={Colors.text3} size={14} strokeWidth={2.5} />
        </View>
      </View>
      {exercise.sets.map((set, index) => (
        <SetRow
          key={set.id}
          exerciseId={exercise.id}
          set={set}
          index={index}
          anterior={anteriors[index] ?? NO_ANTERIOR}
          isPr={prIds.has(set.id)}
          handlers={handlers}
        />
      ))}
      <Pressable accessibilityRole="button" accessibilityLabel="Añadir serie" onPress={onAddSet} style={styles.addSet}>
        <Plus color={Colors.text2} size={16} />
        <Text style={styles.addSetText}>Añadir serie</Text>
      </Pressable>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: -6 },
  title: { ...Type.bodyStrong, color: Colors.ink, flex: 1 },
  more: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  notes: { ...Type.caption, color: Colors.text2 },
  last: { ...Type.caption, color: Colors.text3, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 28, marginTop: 6 },
  label: { ...Type.label, color: Colors.text3 },
  serie: { minWidth: SET_COLUMNS.serie, paddingLeft: 4 },
  anterior: { flex: 1 },
  kg: { width: SET_COLUMNS.kg, textAlign: 'center' },
  reps: { width: SET_COLUMNS.reps, textAlign: 'center' },
  check: { width: SET_COLUMNS.check, alignItems: 'center' },
  addSet: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 },
  addSetText: { ...Type.bodyStrong, color: Colors.text2 },
});

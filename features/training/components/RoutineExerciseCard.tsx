import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowDown, ArrowUp, Minus, Plus, Trash2 } from 'lucide-react-native';
import { Card } from '../../../components/ui/Card';
import { Colors } from '../../../constants/colors';
import { Radius, Spacing } from '../../../constants/spacing';
import { Type, tabular } from '../../../constants/typography';
import { selection } from '../../../lib/haptics';

export type RoutineItem = { id: string; name: string; sets: number; reps: number; weight: string };

export type RoutineItemHandlers = {
  onStep: (id: string, field: 'sets' | 'reps', delta: number) => void;
  onWeight: (id: string, text: string) => void;
  onMove: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
};

type Props = { item: RoutineItem; first: boolean; last: boolean; handlers: RoutineItemHandlers };

type StepProps = { label: string; value: number; onStep: (delta: number) => void };

// Paso compacto (36 visibles, 44 tocables): dos caben en fila con el campo de kg.
const MiniStepper = ({ label, value, onStep }: StepProps) => (
  <View style={styles.control}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Quitar ${label.toLowerCase()}`}
        hitSlop={4}
        onPress={() => {
          selection();
          onStep(-1);
        }}
        style={styles.step}
      >
        <Minus color={Colors.ink} size={16} />
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Añadir ${label.toLowerCase()}`}
        hitSlop={4}
        onPress={() => {
          selection();
          onStep(1);
        }}
        style={styles.step}
      >
        <Plus color={Colors.ink} size={16} />
      </Pressable>
    </View>
  </View>
);

export const RoutineExerciseCard = memo(({ item, first, last, handlers }: Props) => {
  const onSets = useCallback((delta: number) => handlers.onStep(item.id, 'sets', delta), [handlers, item.id]);
  const onReps = useCallback((delta: number) => handlers.onStep(item.id, 'reps', delta), [handlers, item.id]);
  const onWeight = useCallback((text: string) => handlers.onWeight(item.id, text), [handlers, item.id]);
  const up = useCallback(() => handlers.onMove(item.id, -1), [handlers, item.id]);
  const down = useCallback(() => handlers.onMove(item.id, 1), [handlers, item.id]);
  const remove = useCallback(() => handlers.onRemove(item.id), [handlers, item.id]);

  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <Text numberOfLines={2} style={styles.name}>
          {item.name}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Subir" disabled={first} onPress={up} style={styles.icon}>
          <ArrowUp color={first ? Colors.text4 : Colors.text3} size={18} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Bajar" disabled={last} onPress={down} style={styles.icon}>
          <ArrowDown color={last ? Colors.text4 : Colors.text3} size={18} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Quitar ${item.name}`} onPress={remove} style={styles.icon}>
          <Trash2 color={Colors.text3} size={18} />
        </Pressable>
      </View>
      <View style={styles.controls}>
        <MiniStepper label="Series" value={item.sets} onStep={onSets} />
        <MiniStepper label="Reps" value={item.reps} onStep={onReps} />
        <View style={styles.control}>
          <Text style={styles.label}>kg</Text>
          <TextInput
            accessibilityLabel={`Kilos de ${item.name}`}
            value={item.weight}
            onChangeText={onWeight}
            placeholder="0"
            placeholderTextColor={Colors.text4}
            keyboardType="decimal-pad"
            maxLength={7}
            style={styles.kg}
          />
        </View>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: -6, marginRight: -10 },
  name: { ...Type.bodyStrong, color: Colors.ink, flex: 1 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: Spacing.md },
  control: { gap: 4 },
  label: { ...Type.label, color: Colors.text3 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  step: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
  value: { ...Type.bodyStrong, ...tabular, color: Colors.ink, minWidth: 28, textAlign: 'center' },
  kg: {
    ...Type.body,
    ...tabular,
    width: 64,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.fill,
    color: Colors.ink,
    textAlign: 'center',
    paddingVertical: 0,
  },
});

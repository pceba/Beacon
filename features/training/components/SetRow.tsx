import React, { memo, useCallback } from 'react';
import { AccessibilityActionEvent, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { SwipeRow } from '../../../components/ui/SwipeRow';
import { Colors } from '../../../constants/colors';
import { Radius } from '../../../constants/spacing';
import { Type, tabular } from '../../../constants/typography';
import { Anterior } from '../sessionMath';
import { SetDraft } from '../sessionReducer';

export type SetRowHandlers = {
  onEdit: (exerciseId: string, setId: string, field: 'weight' | 'reps', text: string) => void;
  onBlur: (exerciseId: string, setId: string) => void;
  onToggle: (exerciseId: string, setId: string, anterior: Anterior) => void;
  onCopy: (exerciseId: string, setId: string, anterior: Anterior) => void;
  onDelete: (exerciseId: string, setId: string) => void;
  onMenu: (exerciseId: string, setId: string) => void;
};

type Props = {
  exerciseId: string;
  set: SetDraft;
  index: number;
  anterior: Anterior;
  isPr: boolean;
  handlers: SetRowHandlers;
};

const ACTIONS = [{ name: 'delete', label: 'Eliminar serie' }];

export const SetRow = memo(({ exerciseId, set, index, anterior, isPr, handlers }: Props) => {
  const number = index + 1;
  const onWeight = useCallback((text: string) => handlers.onEdit(exerciseId, set.id, 'weight', text), [exerciseId, handlers, set.id]);
  const onReps = useCallback((text: string) => handlers.onEdit(exerciseId, set.id, 'reps', text), [exerciseId, handlers, set.id]);
  const onBlur = useCallback(() => handlers.onBlur(exerciseId, set.id), [exerciseId, handlers, set.id]);
  const onToggle = useCallback(() => handlers.onToggle(exerciseId, set.id, anterior), [anterior, exerciseId, handlers, set.id]);
  const onCopy = useCallback(() => handlers.onCopy(exerciseId, set.id, anterior), [anterior, exerciseId, handlers, set.id]);
  const onDelete = useCallback(() => handlers.onDelete(exerciseId, set.id), [exerciseId, handlers, set.id]);
  const onMenu = useCallback(() => handlers.onMenu(exerciseId, set.id), [exerciseId, handlers, set.id]);
  const onAction = useCallback((event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'delete') onDelete();
  }, [onDelete]);
  const valueStyle = set.proposed ? styles.proposed : null;

  return (
    <SwipeRow label={`Eliminar serie ${number}`} onDelete={onDelete}>
      <Pressable
        accessibilityActions={ACTIONS}
        onAccessibilityAction={onAction}
        onLongPress={onMenu}
        delayLongPress={400}
        style={[styles.row, set.completed ? styles.rowDone : null]}
      >
        <View style={styles.serie}>
          <Text style={styles.number}>{number}</Text>
          {isPr ? (
            <View style={styles.pr}>
              <Text style={styles.prText}>PR</Text>
            </View>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={anterior.weight || anterior.reps ? `Copiar la última vez: ${anterior.label}` : 'Sin dato anterior'}
          disabled={!anterior.weight && !anterior.reps}
          onPress={onCopy}
          onLongPress={onMenu}
          style={styles.anterior}
        >
          <Text numberOfLines={1} style={styles.anteriorText}>
            {anterior.label}
          </Text>
        </Pressable>
        <TextInput
          accessibilityLabel={`Kilos de la serie ${number}`}
          value={set.weight}
          onChangeText={onWeight}
          onBlur={onBlur}
          placeholder={anterior.weight || '0'}
          placeholderTextColor={Colors.text4}
          keyboardType="decimal-pad"
          selectTextOnFocus
          maxLength={7}
          style={[styles.input, styles.kg, valueStyle]}
        />
        <TextInput
          accessibilityLabel={`Repeticiones de la serie ${number}`}
          value={set.reps}
          onChangeText={onReps}
          onBlur={onBlur}
          placeholder={anterior.reps || '0'}
          placeholderTextColor={Colors.text4}
          keyboardType="decimal-pad"
          selectTextOnFocus
          maxLength={4}
          style={[styles.input, styles.reps, valueStyle]}
        />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`Serie ${number} hecha`}
          accessibilityState={{ checked: set.completed }}
          onPress={onToggle}
          style={styles.check}
        >
          <View style={[styles.box, set.completed ? styles.boxDone : null]}>
            {set.completed ? <Check color={Colors.surface} size={16} strokeWidth={3} /> : null}
          </View>
        </Pressable>
      </Pressable>
    </SwipeRow>
  );
});

// SERIE es más ancha que los 28 del diseño para que quepa la etiqueta en versalitas.
export const SET_COLUMNS = { serie: 40, kg: 64, reps: 56, check: 44 } as const;

const styles = StyleSheet.create({
  row: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
  },
  rowDone: { backgroundColor: Colors.successSoft },
  serie: { minWidth: SET_COLUMNS.serie, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 4 },
  number: { ...Type.bodyStrong, ...tabular, color: Colors.ink },
  // La fila hecha ya es successSoft: la pastilla va en blanco para que se distinga.
  pr: { borderRadius: Radius.pill, backgroundColor: Colors.surface, paddingHorizontal: 6, paddingVertical: 1 },
  prText: { ...Type.label, letterSpacing: 0, color: Colors.success },
  anterior: { flex: 1, minHeight: 44, justifyContent: 'center' },
  anteriorText: { ...Type.caption, ...tabular, color: Colors.text3 },
  input: {
    ...Type.body,
    ...tabular,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.fill,
    color: Colors.ink,
    textAlign: 'center',
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  kg: { width: SET_COLUMNS.kg },
  reps: { width: SET_COLUMNS.reps },
  proposed: { color: Colors.text4 },
  check: { width: SET_COLUMNS.check, height: 44, alignItems: 'center', justifyContent: 'center' },
  box: { width: 28, height: 28, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  boxDone: { backgroundColor: Colors.food, borderColor: Colors.food },
});

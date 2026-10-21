import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MoreHorizontal } from 'lucide-react-native';
import { Colors } from '../../../constants/colors';
import { Spacing } from '../../../constants/spacing';
import { Type } from '../../../constants/typography';
import { RoutineSummary } from '../../../services/routineService';
import { routineMeta } from '../labels';

type Props = {
  routine: RoutineSummary;
  locked: boolean;
  last: boolean;
  onStart: (id: string) => void;
  onMenu: (id: string) => void;
};

// Fila 64: tocar empieza el entreno con la rutina; ⋯ abre Editar, Duplicar, Eliminar.
export const RoutineRow = memo(({ routine, locked, last, onStart, onMenu }: Props) => {
  const start = useCallback(() => onStart(routine.id), [onStart, routine.id]);
  const menu = useCallback(() => onMenu(routine.id), [onMenu, routine.id]);
  return (
    <View style={[styles.row, last ? null : styles.divider]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Empezar ${routine.name}`} disabled={locked} onPress={start} style={styles.main}>
        <Text numberOfLines={1} style={[styles.name, locked ? styles.off : null]}>
          {routine.name}
        </Text>
        <Text numberOfLines={1} style={[styles.meta, locked ? styles.off : null]}>
          {routineMeta(routine.exerciseCount, routine.lastDoneAt)}
        </Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Opciones de ${routine.name}`} onPress={menu} style={styles.more}>
        <MoreHorizontal color={Colors.text3} size={20} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center' },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.line },
  main: { flex: 1, minHeight: 64, justifyContent: 'center', gap: 2 },
  name: { ...Type.bodyStrong, color: Colors.ink },
  meta: { ...Type.caption, color: Colors.text3 },
  off: { color: Colors.text4 },
  more: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -Spacing.md },
});

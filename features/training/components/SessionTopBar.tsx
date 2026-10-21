import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MoreHorizontal } from 'lucide-react-native';
import { Colors } from '../../../constants/colors';
import { Radius, Spacing } from '../../../constants/spacing';
import { Type } from '../../../constants/typography';
import { ElapsedTimer } from './ElapsedTimer';

type Live = { mode: 'live'; startedAt: string; onMenu: () => void; onFinish: () => void; finishing?: boolean };
type Edit = { mode: 'edit'; title: string; onMenu: () => void; onClose: () => void };

// Barra de 56: en curso «⋯ · 18:24 · Terminar»; al editar «Cancelar · fecha · ⋯ Listo».
export const SessionTopBar = memo((props: Live | Edit) => {
  const more = (
    <Pressable accessibilityRole="button" accessibilityLabel="Más opciones" onPress={props.onMenu} style={styles.icon}>
      <MoreHorizontal color={Colors.ink} size={22} />
    </Pressable>
  );

  if (props.mode === 'live') {
    return (
      <View style={styles.bar}>
        <View style={styles.side}>{more}</View>
        <ElapsedTimer startedAt={props.startedAt} />
        <View style={[styles.side, styles.right]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Terminar entreno"
            disabled={props.finishing}
            onPress={props.onFinish}
            style={styles.finish}
          >
            <Text style={styles.finishText}>Terminar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cancelar" onPress={props.onClose} style={styles.text}>
          <Text style={styles.cancel}>Cancelar</Text>
        </Pressable>
      </View>
      <Text numberOfLines={1} style={styles.title}>
        {props.title}
      </Text>
      <View style={[styles.side, styles.right]}>
        {more}
        <Pressable accessibilityRole="button" accessibilityLabel="Listo" onPress={props.onClose} style={styles.text}>
          <Text style={styles.done}>Listo</Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  bar: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  right: { justifyContent: 'flex-end' },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  text: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.md },
  cancel: { ...Type.body, color: Colors.text2 },
  done: { ...Type.bodyStrong, color: Colors.accent },
  title: { ...Type.bodyStrong, color: Colors.ink },
  finish: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.s16,
    borderRadius: Radius.pill,
    backgroundColor: Colors.ink,
    marginRight: Spacing.xs,
  },
  finishText: { ...Type.bodyStrong, color: Colors.surface },
});

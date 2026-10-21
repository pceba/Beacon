import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarDays, CheckSquare } from 'lucide-react-native';
import { Sheet } from '../../../components/ui/Sheet';
import { Colors } from '../../../constants/colors';
import { Radius, Spacing } from '../../../constants/spacing';
import { Type } from '../../../constants/typography';

type Props = {
  visible: boolean;
  // Ya resuelto en la pantalla: el contenido de la hoja vive fuera de su navegador.
  dayLabel: string;
  onEvent: () => void;
  onTask: () => void;
  onClose: () => void;
};

// Hoja del + de Plan: crear un evento o una tarea para el día elegido.
export const AddChoiceSheet = ({ visible, dayLabel, onEvent, onTask, onClose }: Props) => (
  <Sheet visible={visible} onClose={onClose} label="Añadir al plan">
    <Text style={styles.title}>Añadir</Text>
    <Text style={styles.caption}>Para el {dayLabel}</Text>
    <View style={styles.grid}>
      <Pressable accessibilityRole="button" accessibilityLabel="Evento" onPress={onEvent} style={styles.tile}>
        <View style={[styles.icon, { backgroundColor: Colors.accentSoft }]}>
          <CalendarDays color={Colors.accent} size={22} />
        </View>
        <Text style={styles.label}>Evento</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Tarea" onPress={onTask} style={styles.tile}>
        <View style={[styles.icon, { backgroundColor: Colors.track }]}>
          <CheckSquare color={Colors.text2} size={22} />
        </View>
        <Text style={styles.label}>Tarea</Text>
      </Pressable>
    </View>
  </Sheet>
);

const styles = StyleSheet.create({
  title: { ...Type.headline, color: Colors.ink },
  caption: { ...Type.caption, color: Colors.text3, marginTop: 2, marginBottom: Spacing.lg },
  grid: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  tile: { flex: 1, height: 96, borderRadius: Radius.lg, backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  label: { ...Type.bodyStrong, color: Colors.ink },
});

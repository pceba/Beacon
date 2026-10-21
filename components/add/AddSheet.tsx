import React, { memo, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BookOpen, Calendar, Dumbbell, Moon, PenLine, Repeat, Scale, Sparkles, SquareCheck, Utensils, X } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Type, tabular } from '../../constants/typography';
import { light } from '../../lib/haptics';
import { invalidateTables } from '../../lib/query';
import { toast } from '../../lib/toast';
import { navigationRef } from '../../navigation/navigationRef';
import { getCurrentUserId } from '../../services/authService';
import { addWater } from '../../services/waterService';
import { formatWater } from '../../utils/format';
import { Sheet } from '../ui/Sheet';

// Abierta o cerrada sin pasar por el estado de MainTabs: pulsar + solo pinta esta hoja.
let isOpen = false;
const listeners = new Set<() => void>();
const setOpen = (next: boolean) => {
  if (isOpen === next) return;
  isOpen = next;
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const openAddSheet = () => setOpen(true);
const closeAddSheet = () => setOpen(false);

const go = (navigate: () => void) => {
  closeAddSheet();
  if (navigationRef.isReady()) navigate();
};

const tiles = [
  { label: 'Comida', icon: Utensils, color: Colors.food, soft: Colors.foodSoft, open: () => navigationRef.navigate('LogMealScreen') },
  { label: 'Entreno', icon: Dumbbell, color: Colors.workout, soft: Colors.workoutSoft, open: () => navigationRef.navigate('LogWorkoutScreen') },
  { label: 'Sueño', icon: Moon, color: Colors.sleep, soft: Colors.sleepSoft, open: () => navigationRef.navigate('LogSleepScreen') },
  { label: 'Tarea', icon: SquareCheck, color: Colors.ink, soft: Colors.bg, open: () => navigationRef.navigate('AddTaskModal') },
  { label: 'Hábito', icon: Repeat, color: Colors.accent, soft: Colors.accentSoft, open: () => navigationRef.navigate('AddHabitModal') },
  {
    label: 'Evento',
    icon: Calendar,
    color: Colors.accent,
    soft: Colors.accentSoft,
    open: () => navigationRef.navigate('MainTabs', { screen: 'Plan', params: { screen: 'EventDetailScreen' } }),
  },
  { label: 'Peso', icon: Scale, color: Colors.text2, soft: Colors.bg, open: () => navigationRef.navigate('LogBodyScreen') },
  { label: 'Nota', icon: PenLine, color: Colors.mood, soft: Colors.moodSoft, open: () => navigationRef.navigate('AddNoteModal') },
  { label: 'Reflexión', icon: BookOpen, color: Colors.mood, soft: Colors.moodSoft, open: () => navigationRef.navigate('AddReflectionModal') },
] as const;

const rows = [tiles.slice(0, 3), tiles.slice(3, 6), tiles.slice(6, 9)];
const WATER = [250, 500, 1000] as const;

const quickWater = async (ml: number) => {
  light();
  closeAddSheet();
  const label = `+${formatWater(ml)} de agua`;
  try {
    const userId = await getCurrentUserId();
    await addWater(userId, new Date(), ml);
    void invalidateTables('water_logs');
    toast.show({
      message: label,
      action: {
        label: 'Deshacer',
        onPress: () => {
          void addWater(userId, new Date(), -ml)
            .then(() => invalidateTables('water_logs'))
            .catch((error) => {
              console.error(error);
              toast.show({ message: 'No se ha podido deshacer.', kind: 'error' });
            });
        },
      },
    });
  } catch (error) {
    console.error(error);
    toast.show({
      message: 'Sin conexión. Lo guardamos en el móvil y lo subimos cuando vuelva la red.',
      kind: 'error',
    });
  }
};

// Se pinta una sola vez: no recibe props y no tiene animaciones de entrada.
const AddSheetContent = memo(() => (
  <>
    <View style={styles.head}>
      <Text style={styles.title}>Añadir</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={4} onPress={closeAddSheet} style={styles.close}>
        <X color={Colors.text2} size={18} />
      </Pressable>
    </View>
    <Text style={styles.caption}>Agua rápida</Text>
    <View style={styles.water}>
      {WATER.map((ml) => (
        <Pressable
          key={ml}
          accessibilityRole="button"
          accessibilityLabel={`+${formatWater(ml)} de agua`}
          onPress={() => void quickWater(ml)}
          style={styles.waterBtn}
        >
          <Text style={styles.waterText}>+{formatWater(ml)}</Text>
        </Pressable>
      ))}
    </View>
    <View style={styles.grid}>
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          {row.map((tile) => {
            const Icon = tile.icon;
            return (
              <Pressable
                key={tile.label}
                accessibilityRole="button"
                accessibilityLabel={tile.label}
                onPress={() => go(tile.open)}
                style={styles.tile}
              >
                <View style={[styles.icon, { backgroundColor: tile.soft }]}>
                  <Icon color={tile.color} size={20} />
                </View>
                <Text style={styles.tileLabel}>{tile.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
    <View style={styles.note}>
      <Sparkles color={Colors.accent} size={16} />
      <Text style={styles.noteText}>También puedes pedírselo a Claude: «apunta 500 ml y una ensalada».</Text>
    </View>
  </>
));

const content = <AddSheetContent />;

export const AddSheet = () => {
  const visible = useSyncExternalStore(subscribe, () => isOpen);
  return (
    <Sheet visible={visible} onClose={closeAddSheet} keepMounted label="Añadir">
      {content}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  title: { ...Type.headline, color: Colors.ink },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  caption: { ...Type.caption, color: Colors.text3, fontFamily: 'Outfit_600SemiBold', marginBottom: 8 },
  water: { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg },
  waterBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.waterSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterText: { ...Type.bodyStrong, ...tabular, color: Colors.water },
  grid: { gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1,
    minHeight: 96,
    borderRadius: Radius.lg,
    backgroundColor: Colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { ...Type.caption, color: Colors.ink, fontFamily: 'Outfit_600SemiBold' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.lg },
  noteText: { ...Type.caption, color: Colors.text3, flex: 1 },
});

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BookOpen, Calendar, Dumbbell, Moon, PenLine, Repeat, Scale, Sparkles, SquareCheck, Utensils, X } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Type, tabular } from '../../constants/typography';
import { light } from '../../lib/haptics';
import { refreshDay } from '../../lib/refresh';
import { toast } from '../../lib/toast';
import { getCurrentUserId } from '../../services/authService';
import { addWater } from '../../services/waterService';
import { MainTabParamList, RootStackParamList } from '../../types/navigation';
import { Sheet } from '../ui/Sheet';

type Nav = CompositeNavigationProp<BottomTabNavigationProp<MainTabParamList>, NativeStackNavigationProp<RootStackParamList>>;

type Props = { visible: boolean; onClose: () => void };

const tiles = [
  { label: 'Comida', icon: Utensils, color: Colors.food, soft: Colors.foodSoft, go: (navigation: Nav) => navigation.navigate('LogMealScreen') },
  { label: 'Entreno', icon: Dumbbell, color: Colors.workout, soft: Colors.workoutSoft, go: (navigation: Nav) => navigation.navigate('LogWorkoutScreen') },
  { label: 'Sueño', icon: Moon, color: Colors.sleep, soft: Colors.sleepSoft, go: (navigation: Nav) => navigation.navigate('LogSleepScreen') },
  { label: 'Tarea', icon: SquareCheck, color: Colors.ink, soft: Colors.bg, go: (navigation: Nav) => navigation.navigate('AddTaskModal') },
  { label: 'Hábito', icon: Repeat, color: Colors.accent, soft: Colors.accentSoft, go: (navigation: Nav) => navigation.navigate('AddHabitModal') },
  { label: 'Evento', icon: Calendar, color: Colors.accent, soft: Colors.accentSoft, go: (navigation: Nav) => navigation.navigate('Plan', { screen: 'EventDetailScreen' }) },
  { label: 'Peso', icon: Scale, color: Colors.text2, soft: Colors.bg, go: (navigation: Nav) => navigation.navigate('LogBodyScreen') },
  { label: 'Nota', icon: PenLine, color: Colors.mood, soft: Colors.moodSoft, go: (navigation: Nav) => navigation.navigate('AddNoteModal') },
  { label: 'Reflexión', icon: BookOpen, color: Colors.mood, soft: Colors.moodSoft, go: (navigation: Nav) => navigation.navigate('AddReflectionModal') },
] as const;

export const AddSheet = ({ visible, onClose }: Props) => {
  const navigation = useNavigation<Nav>();

  const open = (go: (navigation: Nav) => void) => {
    onClose();
    go(navigation);
  };

  const quickWater = async (ml: number, label: string) => {
    light();
    onClose();
    try {
      const userId = await getCurrentUserId();
      await addWater(userId, new Date(), ml);
      refreshDay();
      toast.show({
        message: label,
        action: {
          label: 'Deshacer',
          onPress: () => {
            void addWater(userId, new Date(), -ml)
              .then(() => refreshDay())
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

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.head}>
        <Text style={styles.title}>Añadir</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={4} onPress={onClose} style={styles.close}>
          <X color={Colors.text2} size={18} />
        </Pressable>
      </View>
      <Text style={styles.caption}>Agua rápida</Text>
      <View style={styles.water}>
        {[
          [250, '+250 ml', '+250 ml de agua'],
          [500, '+500 ml', '+500 ml de agua'],
          [1000, '+1 L', '+1 L de agua'],
        ].map(([ml, label, message]) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={String(message)}
            onPress={() => void quickWater(Number(ml), String(message))}
            style={styles.waterBtn}
          >
            <Text style={styles.waterText}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.grid}>
        {[0, 1, 2].map((row) => (
          <View key={row} style={styles.row}>
            {tiles.slice(row * 3, row * 3 + 3).map((tile) => {
              const Icon = tile.icon;
              return (
                <Pressable
                  key={tile.label}
                  accessibilityRole="button"
                  accessibilityLabel={tile.label}
                  onPress={() => open(tile.go)}
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
    </Sheet>
  );
};

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  title: { ...Type.headline, color: Colors.ink },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
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

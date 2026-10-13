import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, isToday } from 'date-fns';
import { ChevronRight, Dumbbell, Moon, Scale, Utensils } from 'lucide-react-native';
import { Card } from '../../components/Card';
import { LineRow } from '../../components/LineRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SectionHeader } from '../../components/SectionHeader';
import { Colors } from '../../constants/colors';
import { Spacing, tabClearance } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { getCurrentUserId } from '../../services/authService';
import { getNutritionLogs } from '../../services/nutritionService';
import { getSleepLogs } from '../../services/sleepService';
import { getWorkouts } from '../../services/workoutService';
import { TimelineEntry } from '../../types/database';
import { LogStackParamList } from '../../types/navigation';
import { mealLabel } from '../../utils/labels';

export const LogHomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<LogStackParamList>>();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [timeline, setTimeline] = useState<Array<TimelineEntry & { sortKey: string }>>([]);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const userId = await getCurrentUserId();
      const [meals, sleeps, workouts] = await Promise.all([getNutritionLogs(userId), getSleepLogs(userId), getWorkouts(userId)]);
      const rows: Array<TimelineEntry & { sortKey: string }> = [
        ...meals.filter((meal) => isToday(new Date(meal.logged_at))).map((meal) => ({
          id: meal.id,
          type: 'nutrition' as const,
          title: meal.name,
          subtitle: `${meal.calories ?? 0} kcal · ${mealLabel(meal.meal_type)}`,
          timestamp: format(new Date(meal.logged_at), 'HH:mm'),
          sortKey: meal.logged_at,
        })),
        ...sleeps.filter((sleep) => isToday(new Date(sleep.created_at))).map((sleep) => ({
          id: sleep.id,
          type: 'sleep' as const,
          title: 'Sueño',
          subtitle: `Calidad ${sleep.quality_rating ?? '—'}/5`,
          timestamp: format(new Date(sleep.created_at), 'HH:mm'),
          sortKey: sleep.created_at,
        })),
        ...workouts.filter((workout) => isToday(new Date(workout.started_at))).map((workout) => ({
          id: workout.id,
          type: 'workout' as const,
          title: workout.name,
          subtitle: workout.completed ? 'Hecho' : 'En curso',
          timestamp: format(new Date(workout.started_at), 'HH:mm'),
          sortKey: workout.started_at,
        })),
      ];
      setTimeline(rows.sort((a, b) => b.sortKey.localeCompare(a.sortKey)));
    } catch (error) {
      console.error(error);
      Alert.alert('No se ha podido cargar', 'Tira hacia abajo para reintentar.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const options = [
    { title: 'Sueño', detail: 'Horas y calidad', icon: Moon, screen: 'LogSleepScreen' as const, tint: Colors.sleep },
    { title: 'Entreno', detail: 'La sesión', icon: Dumbbell, screen: 'LogWorkoutScreen' as const, tint: Colors.workout },
    { title: 'Comida', detail: 'Qué has comido', icon: Utensils, screen: 'LogMealScreen' as const, tint: Colors.nutrition },
    { title: 'Cuerpo', detail: 'Peso', icon: Scale, screen: 'LogBodyScreen' as const, tint: Colors.journal },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingHorizontal: Spacing.lg, paddingBottom: tabClearance(insets.bottom), gap: Spacing.lg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.brownPrimary} />}
    >
      <ScreenHeader title="Registro" />
      <Card>
        {options.map((item, index) => (
          <LineRow
            key={item.title}
            icon={item.icon}
            tint={item.tint}
            label={item.title}
            hint={item.detail}
            onPress={() => navigation.navigate(item.screen)}
            trailing={<ChevronRight color={Colors.textMuted} size={18} />}
            last={index === options.length - 1}
          />
        ))}
      </Card>

      <Card>
        <SectionHeader title="Hoy" />
        {timeline.length === 0 ? <Text style={styles.empty}>Nada registrado hoy.</Text> : null}
        {timeline.map((entry, index) => {
          const icon = entry.type === 'sleep' ? Moon : entry.type === 'workout' ? Dumbbell : Utensils;
          const tint = entry.type === 'sleep' ? Colors.sleep : entry.type === 'workout' ? Colors.workout : Colors.nutrition;
          return (
            <LineRow
              key={entry.id}
              icon={icon}
              tint={tint}
              label={entry.title}
              hint={entry.subtitle}
              value={entry.timestamp}
              last={index === timeline.length - 1}
            />
          );
        })}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  empty: { color: Colors.textMuted, fontFamily: Typography.fontRegular, fontSize: Typography.md, lineHeight: 22 },
});

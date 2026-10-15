import React, { useCallback, useMemo, useState } from 'react';
import { toast } from '../../lib/toast';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { CheckRow } from '../../components/CheckRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SectionHeader } from '../../components/SectionHeader';
import { Colors } from '../../constants/colors';
import { Spacing, tabClearance } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { getCurrentUserId } from '../../services/authService';
import { getEvents } from '../../services/eventService';
import { getTasks, toggleTaskCompleted } from '../../services/taskService';
import { Event, Task } from '../../types/database';
import { shortDay } from '../../utils/labels';

LocaleConfig.locales.es = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
  today: 'Hoy',
};
LocaleConfig.defaultLocale = 'es';

const priorityOrder: Record<Task['priority'], number> = { high: 0, medium: 1, low: 2 };
const dayOf = (value: string | null) => value?.slice(0, 10) ?? '';

export const PlanHomeScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const userId = await getCurrentUserId();
      const [taskRows, eventRows] = await Promise.all([getTasks(userId), getEvents(userId)]);
      setTasks(taskRows.sort((a, b) => Number(a.completed) - Number(b.completed) || priorityOrder[a.priority] - priorityOrder[b.priority]));
      setEvents(eventRows);
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha podido cargar. Tira hacia abajo para reintentar.', kind: 'error' });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const filteredTasks = useMemo(
    () => tasks.filter((task) => dayOf(task.deadline) === selectedDate || (!task.deadline && selectedDate === todayKey)),
    [tasks, selectedDate, todayKey],
  );
  const filteredEvents = useMemo(() => events.filter((event) => dayOf(event.event_date) === selectedDate), [events, selectedDate]);

  const markedDates = useMemo(() => {
    const marks: Record<string, { dots: { color: string }[]; selected?: boolean; selectedColor?: string }> = {};
    events.forEach((event) => {
      const key = dayOf(event.event_date);
      marks[key] = { dots: [...(marks[key]?.dots ?? []), { color: Colors.accent }] };
    });
    tasks.forEach((task) => {
      if (!task.deadline) return;
      const key = dayOf(task.deadline);
      const color = task.completed ? Colors.success : Colors.danger;
      marks[key] = { dots: [...(marks[key]?.dots ?? []), { color }] };
    });
    marks[selectedDate] = { ...(marks[selectedDate] ?? { dots: [] }), selected: true, selectedColor: Colors.ink };
    return marks;
  }, [events, tasks, selectedDate]);

  const onToggleTask = async (task: Task) => {
    const optimistic = tasks.map((item) => (item.id === task.id ? { ...item, completed: !item.completed } : item));
    setTasks(optimistic);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const userId = await getCurrentUserId();
      await toggleTaskCompleted(userId, task);
    } catch (error) {
      console.error(error);
      setTasks(tasks);
      toast.show({ message: 'No se ha actualizado la tarea', kind: 'error' });
    }
  };

  const heading = selectedDate === todayKey ? 'Hoy' : shortDay(selectedDate);

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.md }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabClearance(insets.bottom) }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.ink} />}
      >
        <ScreenHeader title={heading} />

        <Card>
          <Calendar
            markingType="multi-dot"
            markedDates={markedDates}
            firstDay={1}
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            theme={{
              backgroundColor: Colors.surface,
              calendarBackground: Colors.surface,
              textSectionTitleColor: Colors.text3,
              selectedDayBackgroundColor: Colors.ink,
              selectedDayTextColor: Colors.surface,
              todayTextColor: Colors.accent,
              dayTextColor: Colors.ink,
              textDisabledColor: Colors.border,
              arrowColor: Colors.ink,
              monthTextColor: Colors.ink,
              textDayFontFamily: Typography.fontRegular,
              textMonthFontFamily: Typography.fontDisplay,
              textDayHeaderFontFamily: Typography.fontMedium,
            }}
          />
          {selectedDate !== todayKey ? (
            <Text style={styles.showAll} onPress={() => setSelectedDate(todayKey)}>
              Volver a hoy
            </Text>
          ) : null}
        </Card>

        <View style={styles.actions}>
          <Button fill title="Tarea" onPress={() => navigation.navigate('AddTaskModal', { date: selectedDate })} />
          <Button fill title="Evento" variant="secondary" onPress={() => navigation.navigate('EventDetailScreen')} />
        </View>

        <Card>
          <SectionHeader title="Eventos" />
          {filteredEvents.length === 0 ? (
            <Text style={styles.empty}>Sin eventos.</Text>
          ) : (
            filteredEvents.map((event, index) => (
              <Pressable
                key={event.id}
                accessibilityRole="button"
                onPress={() => navigation.navigate('EventDetailScreen', { eventId: event.id })}
                style={({ pressed }) => [styles.event, index === filteredEvents.length - 1 ? styles.eventLast : null, pressed ? styles.pressed : null]}
              >
                <View style={styles.eventCopy}>
                  <Text numberOfLines={1} style={styles.title}>{event.title}</Text>
                  <Text numberOfLines={1} style={styles.subtitle}>
                    {[event.event_time, event.location].filter(Boolean).join(' · ') || shortDay(event.event_date)}
                  </Text>
                </View>
                <ChevronRight color={Colors.text3} size={18} />
              </Pressable>
            ))
          )}
        </Card>

        <Card>
          <SectionHeader title="Tareas" />
          {filteredTasks.length === 0 ? (
            <Text style={styles.empty}>Sin tareas.</Text>
          ) : (
            filteredTasks.map((task) => (
              <CheckRow
                key={task.id}
                title={task.title}
                meta={task.description || undefined}
                done={task.completed}
                emphasis={task.priority === 'high' && !task.completed ? 'ALTA' : undefined}
                onPress={() => onToggleTask(task)}
              />
            ))
          )}
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  showAll: { color: Colors.accent, fontFamily: Typography.fontBold, fontSize: Typography.sm, marginTop: Spacing.md },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  event: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.line,
  },
  eventLast: { borderBottomWidth: 0 },
  eventCopy: { flex: 1, minWidth: 0, gap: 2 },
  title: { color: Colors.ink, fontFamily: Typography.fontBold, fontSize: Typography.md },
  subtitle: { color: Colors.text3, fontFamily: Typography.fontRegular, fontSize: Typography.sm },
  empty: { color: Colors.text3, fontFamily: Typography.fontRegular, fontSize: Typography.md, lineHeight: 22 },
  pressed: { opacity: 0.72 },
});

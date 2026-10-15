import React, { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { MoreHorizontal } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { CheckBox } from '../../components/ui/CheckBox';
import { Sheet } from '../../components/ui/Sheet';
import { Colors } from '../../constants/colors';
import { Spacing, tabClearance } from '../../constants/spacing';
import { Type, tabular } from '../../constants/typography';
import { selection, warning } from '../../lib/haptics';
import { toast } from '../../lib/toast';
import { getCurrentUserId } from '../../services/authService';
import { getEvents } from '../../services/eventService';
import { createTask, deleteTask, getTasks, toggleTaskCompleted } from '../../services/taskService';
import { Event, Task } from '../../types/database';
import { monthDay, weekdayName } from '../../utils/labels';
import { taskTiming } from '../../utils/taskMeta';
import { formatNumber } from '../../utils/format';

const LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const priorityOrder: Record<Task['priority'], number> = { high: 0, medium: 1, low: 2 };
const dayOf = (value: string | null) => value?.slice(0, 10) ?? '';

const atNoon = (date: Date) => {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  return next;
};

const mondayOf = (date: Date) => {
  const next = atNoon(date);
  const offset = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - offset);
  return next;
};

const keyOf = (date: Date) => format(date, 'yyyy-MM-dd');

export const PlanHomeScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(keyOf(new Date()));
  const [weekStart, setWeekStart] = useState(mondayOf(new Date()));
  const [monthOpen, setMonthOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const swipeLock = useRef(false);

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

  const todayKey = keyOf(new Date());
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);
        return date;
      }),
    [weekStart],
  );

  const shiftWeek = (direction: -1 | 1) => {
    setWeekStart((current) => {
      const next = new Date(current);
      next.setDate(current.getDate() + direction * 7);
      return next;
    });
    selection();
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 24 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderRelease: (_, gesture) => {
        if (swipeLock.current) return;
        if (gesture.dx < -48) shiftWeek(1);
        else if (gesture.dx > 48) shiftWeek(-1);
      },
    }),
  ).current;

  const filteredTasks = useMemo(
    () => tasks.filter((task) => dayOf(task.deadline) === selectedDate || (!task.deadline && selectedDate === todayKey && selectedDate === todayKey)),
    [tasks, selectedDate, todayKey],
  );
  const dayTasks = filteredTasks.filter((task) => dayOf(task.deadline) === selectedDate || !task.deadline);
  const filteredEvents = useMemo(
    () => events.filter((event) => dayOf(event.event_date) === selectedDate).sort((a, b) => (a.event_time ?? '').localeCompare(b.event_time ?? '')),
    [events, selectedDate],
  );
  const doneTasks = dayTasks.filter((task) => task.completed).length;
  const selected = new Date(`${selectedDate}T12:00:00`);
  const monthLabel = `${MONTHS[selected.getMonth()]} ${selected.getFullYear()}`;

  const dotsFor = (key: string) => {
    const colors: string[] = [];
    if (events.some((event) => dayOf(event.event_date) === key)) colors.push(Colors.accent);
    if (tasks.some((task) => dayOf(task.deadline) === key && !task.completed)) colors.push(Colors.danger);
    if (tasks.some((task) => dayOf(task.deadline) === key && task.completed)) colors.push(Colors.food);
    return colors.slice(0, 3);
  };

  const onToggleTask = async (task: Task) => {
    setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, completed: !item.completed } : item)));
    try {
      const userId = await getCurrentUserId();
      await toggleTaskCompleted(userId, task);
    } catch (error) {
      console.error(error);
      setTasks((current) => current.map((item) => (item.id === task.id ? task : item)));
      toast.show({ message: 'No se ha actualizado la tarea.', kind: 'error' });
    }
  };

  const removeTask = async (task: Task) => {
    warning();
    setTasks((current) => current.filter((item) => item.id !== task.id));
    try {
      const userId = await getCurrentUserId();
      await deleteTask(userId, task.id);
      toast.show({
        message: 'Tarea eliminada',
        action: {
          label: 'Deshacer',
          onPress: () => {
            void createTask(userId, {
              title: task.title,
              description: task.description,
              deadline: task.deadline,
              completed: task.completed,
              priority: task.priority,
            })
              .then((created) => setTasks((current) => [created, ...current]))
              .catch((error) => {
                console.error(error);
                toast.show({ message: 'No se ha podido recuperar la tarea.', kind: 'error' });
              });
          },
        },
      });
    } catch (error) {
      console.error(error);
      setTasks((current) => [task, ...current]);
      toast.show({ message: 'No se ha podido eliminar.', kind: 'error' });
    }
  };

  const goToday = () => {
    const now = new Date();
    setSelectedDate(keyOf(now));
    setWeekStart(mondayOf(now));
    selection();
  };

  const monthCells = useMemo(() => {
    const first = new Date(selected.getFullYear(), selected.getMonth(), 1, 12);
    const lead = (first.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(first);
      date.setDate(1 - lead + index);
      return date;
    });
  }, [selected]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Spacing.lg }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabClearance(insets.bottom) + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.ink} />}
      >
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Abrir el mes" onPress={() => setMonthOpen(true)} style={styles.headerCopy}>
            <Text style={styles.overline}>{monthLabel}</Text>
            <Text style={styles.title}>Plan</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Hoy" onPress={goToday} style={styles.today}>
            <Text style={styles.todayText}>Hoy</Text>
          </Pressable>
        </View>

        <View {...pan.panHandlers}>
          <Card>
            <View style={styles.week}>
              {days.map((date, index) => {
                const key = keyOf(date);
                const on = key === selectedDate;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="tab"
                    accessibilityLabel={`${weekdayName(date)} ${date.getDate()}`}
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      setSelectedDate(key);
                      selection();
                    }}
                    style={[styles.day, on ? styles.dayOn : null]}
                  >
                    <Text style={[styles.letter, on ? styles.onText : null]}>{LETTERS[index]}</Text>
                    <Text style={[styles.number, on ? styles.onText : null]}>{formatNumber(date.getDate())}</Text>
                    <View style={styles.dots}>
                      {dotsFor(key).map((color, dotIndex) => (
                        <View key={dotIndex} style={[styles.dot, { backgroundColor: on ? Colors.surface : color }]} />
                      ))}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </View>

        <Text style={styles.section}>
          {weekdayName(selected)} {formatNumber(selected.getDate())}
        </Text>
        <Card inset>
          {filteredEvents.length === 0 ? <Text style={styles.empty}>Nada en la agenda.</Text> : null}
          {filteredEvents.map((event, index) => (
            <Pressable
              key={event.id}
              accessibilityRole="button"
              accessibilityLabel={event.title}
              onPress={() => navigation.navigate('EventDetailScreen', { eventId: event.id })}
              style={[styles.agenda, index === filteredEvents.length - 1 ? styles.last : null]}
            >
              <Text style={styles.time}>{(event.event_time ?? '').slice(0, 5) || '—'}</Text>
              <View style={[styles.bar, { backgroundColor: Colors.accent }]} />
              <View style={styles.agendaCopy}>
                <Text style={styles.agendaTitle}>{event.title}</Text>
                {event.location ? <Text style={styles.meta}>{event.location}</Text> : null}
              </View>
            </Pressable>
          ))}
        </Card>

        <View style={styles.sectionHead}>
          <Text style={styles.section}>Tareas</Text>
          <Text style={styles.meta}>
            {formatNumber(doneTasks)} de {formatNumber(dayTasks.length)} hechas
          </Text>
        </View>
        <Card inset>
          {dayTasks.length === 0 ? <Text style={styles.empty}>Sin tareas este día.</Text> : null}
          {dayTasks.map((task) => (
            <Swipeable
              key={task.id}
              renderRightActions={() => (
                <Pressable accessibilityRole="button" accessibilityLabel={`Eliminar ${task.title}`} onPress={() => void removeTask(task)} style={styles.swipe}>
                  <Text style={styles.swipeText}>Eliminar</Text>
                </Pressable>
              )}
            >
              <View style={styles.task}>
                <CheckBox done={task.completed} label={task.title} onPress={() => onToggleTask(task)} />
                <View style={styles.taskCopy}>
                  <Text style={[styles.taskTitle, task.completed ? styles.taskDone : null]}>{task.title}</Text>
                  {(() => {
                    const timing = !task.completed ? taskTiming(task.deadline, todayKey, task.priority) : null;
                    return timing ? <Text style={timing.overdue ? styles.due : styles.when}>{timing.text}</Text> : null;
                  })()}
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Opciones de ${task.title}`} hitSlop={10} onPress={() => void removeTask(task)} style={styles.more}>
                  <MoreHorizontal color={Colors.text3} size={18} />
                </Pressable>
              </View>
            </Swipeable>
          ))}
        </Card>
      </ScrollView>

      <Sheet visible={monthOpen} onClose={() => setMonthOpen(false)}>
        <Text style={styles.monthTitle}>{monthLabel}</Text>
        <View style={styles.monthGrid}>
          {LETTERS.map((letter) => (
            <Text key={letter} style={styles.monthLetter}>
              {letter}
            </Text>
          ))}
          {monthCells.map((date) => {
            const key = keyOf(date);
            const inMonth = date.getMonth() === selected.getMonth();
            const on = key === selectedDate;
            return (
              <Pressable
                key={key + date.getMonth()}
                accessibilityRole="button"
                accessibilityLabel={monthDay(date)}
                onPress={() => {
                  setSelectedDate(key);
                  setWeekStart(mondayOf(date));
                  setMonthOpen(false);
                  selection();
                }}
                style={[styles.monthDay, on ? styles.dayOn : null]}
              >
                <Text style={[styles.monthNum, !inMonth ? styles.monthOut : null, on ? styles.onText : null]}>{formatNumber(date.getDate())}</Text>
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  headerCopy: { gap: 2, minHeight: 44, justifyContent: 'center' },
  overline: { ...Type.overline, color: Colors.text3 },
  title: { ...Type.title, color: Colors.ink },
  today: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: { ...Type.bodyStrong, fontSize: 14, color: Colors.ink },
  week: { flexDirection: 'row', gap: 2 },
  day: { flex: 1, minHeight: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dayOn: { backgroundColor: Colors.ink },
  letter: { fontFamily: 'Outfit_600SemiBold', fontSize: 11, color: Colors.text3 },
  number: { ...tabular, fontFamily: 'Outfit_600SemiBold', fontSize: 18, color: Colors.ink },
  onText: { color: Colors.surface },
  dots: { flexDirection: 'row', gap: 2, height: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  section: { ...Type.section, color: Colors.ink, textTransform: 'capitalize' },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  empty: { ...Type.body, color: Colors.text3, paddingVertical: 14 },
  agenda: { minHeight: 56, flexDirection: 'row', alignItems: 'center' },
  last: {},
  time: { width: 64, textAlign: 'right', paddingRight: 10, ...Type.caption, ...tabular, color: Colors.text3, fontFamily: 'Outfit_600SemiBold' },
  bar: { width: 3, alignSelf: 'stretch', borderRadius: 2, marginRight: 10 },
  agendaCopy: { flex: 1, gap: 2, paddingVertical: 10 },
  agendaTitle: { ...Type.bodyStrong, color: Colors.ink },
  meta: { ...Type.caption, color: Colors.text3 },
  task: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface },
  taskCopy: { flex: 1, gap: 2 },
  taskTitle: { ...Type.body, color: Colors.ink },
  taskDone: { color: Colors.text4, textDecorationLine: 'line-through' },
  due: { ...Type.caption, color: Colors.danger },
  when: { ...Type.caption, color: Colors.text2 },
  more: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  swipe: { backgroundColor: Colors.danger, justifyContent: 'center', paddingHorizontal: 16 },
  swipeText: { ...Type.bodyStrong, color: Colors.surface },
  monthTitle: { ...Type.headline, color: Colors.ink, textTransform: 'capitalize', marginBottom: Spacing.md },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthLetter: { width: '14.28%', textAlign: 'center', ...Type.caption, color: Colors.text3, marginBottom: 8 },
  monthDay: { width: '14.28%', minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  monthNum: { ...tabular, ...Type.body, color: Colors.ink },
  monthOut: { color: Colors.text4 },
});

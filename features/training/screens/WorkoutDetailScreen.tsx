import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, ListRenderItem, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { NavigationProp, RouteProp, StackActions, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../../components/ui/Button';
import { InlineError } from '../../../components/ui/InlineError';
import { Colors } from '../../../constants/colors';
import { Spacing } from '../../../constants/spacing';
import { Type } from '../../../constants/typography';
import { LogStackParamList } from '../../../types/navigation';
import { LoggedExercise, LoggedSet, maxE1rm, normalizeExerciseName } from '../../../utils/exerciseProgress';
import { finishLog, useReturnToToday } from '../../../utils/finishLog';
import { ExerciseCard } from '../components/ExerciseCard';
import { RestBar } from '../components/RestBar';
import { SessionSheets } from '../components/SessionSheets';
import { SessionTopBar } from '../components/SessionTopBar';
import { useRestTimer } from '../hooks/useRestTimer';
import { useSession } from '../hooks/useSession';
import { useSessionFlow } from '../hooks/useSessionFlow';
import { weekdayDayMonth } from '../labels';
import { historyBefore, previousSession } from '../sessionMath';
import { ExerciseDraft } from '../sessionReducer';
import { trainingQueries } from '../trainingQueries';

type Route = RouteProp<LogStackParamList, 'WorkoutDetailScreen'>;

const NO_HISTORY: LoggedExercise[] = [];
const keyOf = (exercise: ExerciseDraft) => exercise.id;

export const WorkoutDetailScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<NavigationProp<LogStackParamList>>();
  const insets = useSafeAreaInsets();
  const { workoutId, fromToday, mode } = route.params;
  useReturnToToday(fromToday);
  const { state, status, stateRef, actions } = useSession(workoutId);
  const strength = useQuery(trainingQueries.strength());
  const rest = useRestTimer();
  const [nameFocused, setNameFocused] = useState(false);
  const workout = state.workout;
  const live = !!workout && !workout.completed && mode !== 'edit';

  const history = useMemo(
    () => historyBefore(strength.data ?? NO_HISTORY, workoutId, workout?.startedAt),
    [strength.data, workout?.startedAt, workoutId],
  );

  // Por nombre normalizado, para que cada tarjeta reciba siempre la misma referencia.
  const namesKey = state.exercises.map((exercise) => normalizeExerciseName(exercise.name)).join('\n');
  const lookups = useMemo(() => {
    const previous = new Map<string, LoggedSet[] | null>();
    const best = new Map<string, number | null>();
    namesKey.split('\n').forEach((key) => {
      if (!key || previous.has(key)) return;
      previous.set(key, previousSession(history, key));
      best.set(key, maxE1rm(history, key));
    });
    return { previous, best };
  }, [history, namesKey]);

  const close = useCallback(() => finishLog(navigation, fromToday), [fromToday, navigation]);
  const saveAsRoutine = useCallback(
    () => navigation.dispatch(StackActions.replace('RoutineEditorScreen', { fromWorkoutId: workoutId })),
    [navigation, workoutId],
  );

  const flow = useSessionFlow({
    actions,
    stateRef,
    history,
    live,
    startRest: rest.start,
    stopRest: rest.stop,
    toggleRest: rest.toggleEnabled,
    close,
    saveAsRoutine,
  });
  const { handlers, setSheet, openPicker: openPickerIn } = flow;

  const renderItem: ListRenderItem<ExerciseDraft> = useCallback(
    ({ item }) => {
      const key = normalizeExerciseName(item.name);
      return <ExerciseCard exercise={item} previous={lookups.previous.get(key) ?? null} best={lookups.best.get(key) ?? null} handlers={handlers} />;
    },
    [handlers, lookups],
  );

  const openMenu = useCallback(() => setSheet('workoutMenu'), [setSheet]);
  const openPicker = useCallback(() => openPickerIn('multi'), [openPickerIn]);
  const onSaveExerciseNotes = useCallback((id: string, notes: string) => actions.patchExercise(id, { notes: notes.trim() || null }), [actions]);

  if (status !== 'ready' || !workout) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        {status === 'error' ? (
          <View style={styles.error}>
            <InlineError title="No se ha podido abrir el entreno" body="Comprueba la conexión y vuelve a intentarlo." onRetry={() => void actions.reload()} />
            <Button title="Cerrar" variant="ghost" onPress={close} />
          </View>
        ) : (
          <ActivityIndicator color={Colors.text3} />
        )}
      </View>
    );
  }

  const header = (
    <View style={styles.head}>
      <TextInput
        accessibilityLabel="Nombre del entreno"
        value={workout.name}
        onChangeText={actions.renameWorkout}
        onFocus={() => setNameFocused(true)}
        onBlur={() => {
          setNameFocused(false);
          void actions.flushAll();
        }}
        placeholder="Entreno"
        placeholderTextColor={Colors.text4}
        maxLength={60}
        style={[styles.name, nameFocused ? styles.nameFocused : null]}
      />
      {workout.notes ? <Text style={styles.notes}>{workout.notes}</Text> : null}
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      {state.exercises.length === 0 ? <Text style={styles.empty}>Añade el primer ejercicio para empezar.</Text> : null}
      <Button title="Añadir ejercicios" variant="secondary" onPress={openPicker} />
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {live ? (
        <SessionTopBar mode="live" startedAt={workout.startedAt} onMenu={openMenu} onFinish={() => void flow.requestFinish()} finishing={flow.busy} />
      ) : (
        <SessionTopBar mode="edit" title={weekdayDayMonth(workout.startedAt)} onMenu={openMenu} onClose={close} />
      )}
      <FlatList
        data={state.exercises}
        keyExtractor={keyOf}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        removeClippedSubviews={false}
      />
      {live && rest.rest ? <RestBar rest={rest.rest} bottom={insets.bottom + Spacing.sm} onAdjust={rest.adjust} onSkip={rest.stop} /> : null}
      <SessionSheets
        flow={flow}
        state={state}
        live={live}
        restSeconds={rest.seconds}
        onSaveMeta={actions.setWorkoutMeta}
        onSaveExerciseNotes={onSaveExerciseNotes}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  error: { paddingHorizontal: Spacing.lg, alignSelf: 'stretch' },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  head: { gap: Spacing.xs, marginBottom: Spacing.xs },
  name: {
    ...Type.headline,
    fontSize: 24,
    lineHeight: 30,
    color: Colors.ink,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  nameFocused: { borderBottomColor: Colors.accent },
  notes: { ...Type.caption, color: Colors.text2 },
  footer: { gap: Spacing.md, paddingTop: Spacing.xs },
  empty: { ...Type.body, color: Colors.text3, textAlign: 'center', paddingVertical: Spacing.lg },
});

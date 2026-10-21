import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '../../../lib/toast';
import { getCurrentUserId } from '../../../services/authService';
import { deleteWorkout, getWorkoutSession, updateWorkout } from '../../../services/workoutService';
import { deleteExercise, finishWorkout, insertExercises, saveExerciseOrder, updateExercise } from '../../../services/workoutSessionService';
import { uuid } from '../../../utils/uuid';
import { durationMinutes } from '../numbers';
import { refreshTraining } from '../navigation';
import {
  draftFromRows,
  EMPTY_SESSION,
  ExerciseDraft,
  exerciseRow,
  exercisesLeftEmpty,
  newExerciseDraft,
  SessionAction,
  sessionReducer,
  SessionState,
  setRow,
  setValues,
  SetValues,
} from '../sessionReducer';
import { createWriteQueue } from '../writeQueue';
import { DEBOUNCE_MS, useSetWrites } from './useSetWrites';

// La sesión se pinta desde este estado local: cada cambio se ve al momento y se guarda
// en segundo plano por una cola en serie. Si una escritura falla, se deshace ese cambio.

const UNDONE = 'No se ha guardado. Lo hemos deshecho.';

type Timer = ReturnType<typeof setTimeout>;

export const useSession = (workoutId: string) => {
  const [state, setState] = useState<SessionState>(EMPTY_SESSION);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const stateRef = useRef(state);
  const userRef = useRef<string | null>(null);
  const persisted = useRef(new Map<string, SetValues>());
  const nameTimer = useRef<Timer | null>(null);
  const savedMeta = useRef({ name: '', notes: null as string | null });
  const queue = useMemo(() => createWriteQueue((error) => console.error(error)), []);

  const apply = useCallback((action: SessionAction) => {
    stateRef.current = sessionReducer(stateRef.current, action);
    setState(stateRef.current);
  }, []);

  const write = useCallback(
    (task: (userId: string) => Promise<void>, rollback: () => void) => {
      void queue.run(
        async () => task(userRef.current ?? (await getCurrentUserId())),
        () => {
          rollback();
          toast.show({ message: UNDONE, kind: 'error' });
        },
      );
    },
    [queue],
  );

  const sets = useSetWrites({ stateRef, persisted, apply, write });
  const { cancelSet, cancelAll, flushSets } = sets;

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const userId = await getCurrentUserId();
      userRef.current = userId;
      const { workout, exercises } = await getWorkoutSession(userId, workoutId);
      const next = draftFromRows(workout, exercises);
      persisted.current = new Map(next.exercises.flatMap((exercise) => exercise.sets.map((set): [string, SetValues] => [set.id, setValues(set)])));
      savedMeta.current = { name: workout.name, notes: workout.notes };
      apply({ type: 'load', state: next });
      setStatus('ready');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }, [apply, workoutId]);

  // Las filas con order_index se toman al encolar: todo lo que hay en pantalla ya está guardado o en la cola.
  const orderRows = () => {
    const workout = stateRef.current.workout;
    return workout ? stateRef.current.exercises.map((exercise, index) => exerciseRow(workout.id, exercise, index)) : [];
  };

  const insertExerciseDrafts = useCallback(
    (drafts: ExerciseDraft[], index?: number) => {
      const workout = stateRef.current.workout;
      if (!workout || drafts.length === 0) return;
      apply({ type: 'insertExercises', exercises: drafts, index });
      const rows = orderRows();
      const items = drafts.map((draft) => ({
        ...(rows.find((row) => row.id === draft.id) as ReturnType<typeof exerciseRow>),
        sets: draft.sets.map((set) => setRow(draft.id, set)),
      }));
      write(
        async (userId) => {
          await insertExercises(userId, workout.id, items);
          drafts.forEach((draft) => draft.sets.forEach((set) => persisted.current.set(set.id, setValues(set))));
          // Tras borrar ejercicios quedan huecos en order_index: se renumera todo para no empatar.
          await saveExerciseOrder(rows);
        },
        () => drafts.forEach((draft) => apply({ type: 'removeExercise', exerciseId: draft.id })),
      );
    },
    [apply, write],
  );

  const addExercises = useCallback(
    (names: string[], setCounts: number[]) => {
      insertExerciseDrafts(names.map((name, i) => newExerciseDraft(uuid(), name, Array.from({ length: Math.max(1, setCounts[i] ?? 1) }, () => uuid()))));
    },
    [insertExerciseDrafts],
  );

  const removeExercise = useCallback(
    (exerciseId: string) => {
      const index = stateRef.current.exercises.findIndex((item) => item.id === exerciseId);
      if (index < 0) return;
      const exercise = stateRef.current.exercises[index];
      exercise.sets.forEach((set) => cancelSet(set.id));
      apply({ type: 'removeExercise', exerciseId });
      write(
        () => deleteExercise(exerciseId),
        () => apply({ type: 'insertExercises', exercises: [exercise], index }),
      );
      toast.show({ message: 'Ejercicio eliminado', action: { label: 'Deshacer', onPress: () => insertExerciseDrafts([exercise], index) } });
    },
    [apply, cancelSet, insertExerciseDrafts, write],
  );

  const moveExercise = useCallback(
    (exerciseId: string, delta: number) => {
      const before = stateRef.current.exercises;
      apply({ type: 'moveExercise', exerciseId, delta });
      if (stateRef.current.exercises === before) return;
      const rows = orderRows();
      write(
        () => saveExerciseOrder(rows),
        () => apply({ type: 'moveExercise', exerciseId, delta: -delta }),
      );
    },
    [apply, write],
  );

  const patchExercise = useCallback(
    (exerciseId: string, patch: { name?: string; notes?: string | null }) => {
      const exercise = stateRef.current.exercises.find((item) => item.id === exerciseId);
      if (!exercise) return;
      const previous = { name: exercise.name, notes: exercise.notes };
      apply({ type: 'patchExercise', exerciseId, patch });
      const row: { exercise_name?: string; notes?: string | null } = {};
      if (patch.name != null) row.exercise_name = patch.name;
      if (patch.notes !== undefined) row.notes = patch.notes;
      write(
        () => updateExercise(exerciseId, row),
        () => apply({ type: 'patchExercise', exerciseId, patch: previous }),
      );
    },
    [apply, write],
  );

  const saveMeta = useCallback(() => {
    if (nameTimer.current) clearTimeout(nameTimer.current);
    nameTimer.current = null;
    const workout = stateRef.current.workout;
    if (!workout) return;
    const next = { name: workout.name.trim() || 'Entreno', notes: workout.notes?.trim() || null };
    const previous = savedMeta.current;
    if (next.name === previous.name && next.notes === previous.notes) return;
    savedMeta.current = next;
    write(
      (userId) => updateWorkout(userId, workout.id, next),
      () => {
        savedMeta.current = previous;
        apply({ type: 'patchWorkout', patch: previous });
      },
    );
  }, [apply, write]);

  const renameWorkout = useCallback(
    (name: string) => {
      apply({ type: 'patchWorkout', patch: { name } });
      if (nameTimer.current) clearTimeout(nameTimer.current);
      nameTimer.current = setTimeout(saveMeta, DEBOUNCE_MS);
    },
    [apply, saveMeta],
  );

  const setWorkoutMeta = useCallback(
    (name: string, notes: string | null) => {
      apply({ type: 'patchWorkout', patch: { name, notes } });
      saveMeta();
    },
    [apply, saveMeta],
  );

  // Guarda ya lo que espera su retardo y devuelve cuando la cola está vacía.
  const flushAll = useCallback(() => {
    flushSets();
    if (nameTimer.current) saveMeta();
    return queue.idle();
  }, [flushSets, queue, saveMeta]);

  const finish = useCallback(
    async (doneIds: string[], dropIds: string[]) => {
      await flushAll();
      const current = stateRef.current;
      const workout = current.workout;
      if (!workout) return;
      const minutes = durationMinutes(workout.startedAt);
      const name = workout.name.trim() || 'Entreno';
      await finishWorkout(userRef.current ?? (await getCurrentUserId()), workout.id, {
        doneIds,
        dropSetIds: dropIds,
        dropExerciseIds: exercisesLeftEmpty(current.exercises, dropIds),
        durationMinutes: minutes,
        name,
      });
      apply({ type: 'finish', doneIds, dropIds });
      apply({ type: 'patchWorkout', patch: { durationMinutes: minutes, name } });
      refreshTraining();
    },
    [apply, flushAll],
  );

  const discard = useCallback(async () => {
    cancelAll();
    if (nameTimer.current) clearTimeout(nameTimer.current);
    nameTimer.current = null;
    await queue.idle();
    await deleteWorkout(userRef.current ?? (await getCurrentUserId()), workoutId);
    refreshTraining();
  }, [cancelAll, queue, workoutId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Al salir: se guarda lo pendiente y, al acabar, Hoy y Datos vuelven a leer.
  useEffect(
    () => () => {
      void flushAll().then(refreshTraining);
    },
    [flushAll],
  );

  const { editSet, flushSet, toggleSet, copyToSet, addSet, removeSet } = sets;
  const actions = useMemo(
    () => ({
      editSet,
      flushSet,
      toggleSet,
      copyToSet,
      addSet,
      removeSet,
      addExercises,
      removeExercise,
      moveExercise,
      patchExercise,
      renameWorkout,
      setWorkoutMeta,
      flushAll,
      finish,
      discard,
      reload: load,
    }),
    [addExercises, addSet, copyToSet, discard, editSet, finish, flushAll, flushSet, load, moveExercise, patchExercise, removeExercise, removeSet, renameWorkout, setWorkoutMeta, toggleSet],
  );

  return { state, status, stateRef, actions };
};

export type SessionActions = ReturnType<typeof useSession>['actions'];

import { MutableRefObject, useCallback, useRef } from 'react';
import { toast } from '../../../lib/toast';
import { deleteSets, insertSets, updateSet } from '../../../services/workoutSessionService';
import { uuid } from '../../../utils/uuid';
import { repsText, sanitizeDecimal, weightText } from '../numbers';
import { newSetAfter, SessionAction, SessionState, SetDraft, setRow, setValues, SetValues } from '../sessionReducer';

export const DEBOUNCE_MS = 400;

type Timer = ReturnType<typeof setTimeout>;
type Fill = { weight: string; reps: string };

export type SessionCore = {
  stateRef: MutableRefObject<SessionState>;
  persisted: MutableRefObject<Map<string, SetValues>>;
  apply: (action: SessionAction) => void;
  write: (task: (userId: string) => Promise<void>, rollback: () => void) => void;
};

const sameValues = (a: SetValues | undefined, b: SetValues) =>
  !!a && a.weight_kg === b.weight_kg && a.reps === b.reps && a.completed === b.completed;

export const useSetWrites = ({ stateRef, persisted, apply, write }: SessionCore) => {
  const versions = useRef(new Map<string, number>());
  const timers = useRef(new Map<string, { timer: Timer; exerciseId: string }>());

  const findSet = useCallback(
    (exerciseId: string, setId: string) =>
      stateRef.current.exercises.find((exercise) => exercise.id === exerciseId)?.sets.find((set) => set.id === setId),
    [stateRef],
  );

  const cancelSet = useCallback((setId: string) => {
    const pending = timers.current.get(setId);
    if (pending) clearTimeout(pending.timer);
    timers.current.delete(setId);
  }, []);

  const saveSet = useCallback(
    (exerciseId: string, setId: string) => {
      cancelSet(setId);
      const set = findSet(exerciseId, setId);
      if (!set) return;
      const values = setValues(set);
      if (sameValues(persisted.current.get(setId), values)) return;
      const version = (versions.current.get(setId) ?? 0) + 1;
      versions.current.set(setId, version);
      write(
        async () => {
          await updateSet(setId, values);
          persisted.current.set(setId, values);
        },
        () => {
          // Si después se ha encolado otro guardado de la misma serie, manda ese.
          const last = persisted.current.get(setId);
          if (versions.current.get(setId) !== version || !last) return;
          apply({ type: 'patchSet', exerciseId, setId, patch: { weight: weightText(last.weight_kg), reps: repsText(last.reps), completed: last.completed } });
        },
      );
    },
    [apply, cancelSet, findSet, persisted, write],
  );

  const editSet = useCallback(
    (exerciseId: string, setId: string, field: 'weight' | 'reps', text: string) => {
      apply({ type: 'editSet', exerciseId, setId, field, text: sanitizeDecimal(text, field === 'reps' ? 0 : 2) });
      cancelSet(setId);
      timers.current.set(setId, { exerciseId, timer: setTimeout(() => saveSet(exerciseId, setId), DEBOUNCE_MS) });
    },
    [apply, cancelSet, saveSet],
  );

  const flushSet = useCallback(
    (exerciseId: string, setId: string) => {
      if (timers.current.has(setId)) saveSet(exerciseId, setId);
    },
    [saveSet],
  );

  const flushSets = useCallback(() => {
    [...timers.current.entries()].forEach(([setId, pending]) => saveSet(pending.exerciseId, setId));
  }, [saveSet]);

  const cancelAll = useCallback(() => {
    [...timers.current.keys()].forEach(cancelSet);
  }, [cancelSet]);

  // Marca o desmarca. Al marcar una serie vacía toma los valores de «Anterior».
  const toggleSet = useCallback(
    (exerciseId: string, setId: string, fill?: Fill): SetDraft | null => {
      const set = findSet(exerciseId, setId);
      if (!set) return null;
      const completed = !set.completed;
      const patch: Partial<SetDraft> = { completed, proposed: false };
      if (completed && fill) {
        if (!set.weight.trim() && fill.weight) patch.weight = fill.weight;
        if (!set.reps.trim() && fill.reps) patch.reps = fill.reps;
      }
      apply({ type: 'patchSet', exerciseId, setId, patch });
      saveSet(exerciseId, setId);
      return findSet(exerciseId, setId) ?? null;
    },
    [apply, findSet, saveSet],
  );

  const copyToSet = useCallback(
    (exerciseId: string, setId: string, fill: Fill) => {
      apply({ type: 'patchSet', exerciseId, setId, patch: { weight: fill.weight, reps: fill.reps, proposed: false } });
      saveSet(exerciseId, setId);
    },
    [apply, saveSet],
  );

  const insertSet = useCallback(
    (exerciseId: string, set: SetDraft, index?: number) => {
      if (!stateRef.current.exercises.some((exercise) => exercise.id === exerciseId)) return;
      apply({ type: 'insertSet', exerciseId, set, index });
      write(
        async () => {
          await insertSets([setRow(exerciseId, set)]);
          persisted.current.set(set.id, setValues(set));
        },
        () => apply({ type: 'removeSet', exerciseId, setId: set.id }),
      );
    },
    [apply, persisted, stateRef, write],
  );

  const addSet = useCallback(
    (exerciseId: string) => {
      const exercise = stateRef.current.exercises.find((item) => item.id === exerciseId);
      if (exercise) insertSet(exerciseId, newSetAfter(exercise, uuid()));
    },
    [insertSet, stateRef],
  );

  const removeSet = useCallback(
    (exerciseId: string, setId: string) => {
      const exercise = stateRef.current.exercises.find((item) => item.id === exerciseId);
      const index = exercise?.sets.findIndex((set) => set.id === setId) ?? -1;
      if (!exercise || index < 0) return;
      const set = exercise.sets[index];
      cancelSet(setId);
      apply({ type: 'removeSet', exerciseId, setId });
      write(
        () => deleteSets([setId]),
        () => apply({ type: 'insertSet', exerciseId, set, index }),
      );
      toast.show({ message: 'Serie eliminada', action: { label: 'Deshacer', onPress: () => insertSet(exerciseId, set, index) } });
    },
    [apply, cancelSet, insertSet, stateRef, write],
  );

  return { editSet, flushSet, flushSets, toggleSet, copyToSet, addSet, removeSet, cancelSet, cancelAll };
};

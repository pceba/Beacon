import { MutableRefObject, useCallback, useMemo, useRef, useState } from 'react';
import { light, selection, success } from '../../../lib/haptics';
import { toast } from '../../../lib/toast';
import { LoggedExercise, maxE1rm } from '../../../utils/exerciseProgress';
import { ExerciseHandlers } from '../components/ExerciseCard';
import { UntickedChoice } from '../components/FinishSheets';
import { Anterior, previousSession, prSetIds, SessionSummary, summarizeSession } from '../sessionMath';
import { planFinish, SessionState } from '../sessionReducer';
import { SessionActions } from './useSession';

export type SheetKind =
  | 'workoutMenu'
  | 'exerciseMenu'
  | 'setMenu'
  | 'exerciseNotes'
  | 'workoutMeta'
  | 'picker'
  | 'confirmDiscard'
  | 'unticked'
  | 'confirmEmpty'
  | 'summary'
  | null;

type Options = {
  actions: SessionActions;
  stateRef: MutableRefObject<SessionState>;
  history: LoggedExercise[];
  live: boolean;
  startRest: () => void;
  stopRest: () => void;
  toggleRest: () => void;
  close: () => void;
  saveAsRoutine: () => void;
};

// Menús, selector y «Terminar» de la sesión. Las hojas se pintan en SessionSheets.
export const useSessionFlow = ({ actions, stateRef, history, live, startRest, stopRest, toggleRest, close, saveAsRoutine }: Options) => {
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [target, setTarget] = useState<{ exerciseId: string | null; setId: string | null }>({ exerciseId: null, setId: null });
  const [pickerMode, setPickerMode] = useState<'multi' | 'single'>('multi');
  const [untickedCount, setUntickedCount] = useState(0);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const celebrated = useRef(new Set<string>());
  const historyRef = useRef(history);
  historyRef.current = history;
  const liveRef = useRef(live);
  liveRef.current = live;

  const closeSheet = useCallback(() => setSheet(null), []);

  const onToggle = useCallback(
    (exerciseId: string, setId: string, anterior: Anterior) => {
      const set = actions.toggleSet(exerciseId, setId, anterior);
      if (!set?.completed) return;
      const exercise = stateRef.current.exercises.find((item) => item.id === exerciseId);
      const record = !!exercise && prSetIds(exercise.sets, maxE1rm(historyRef.current, exercise.name)).includes(setId);
      if (record && !celebrated.current.has(setId)) {
        celebrated.current.add(setId);
        success();
      } else {
        light();
      }
      if (liveRef.current) startRest();
    },
    [actions, startRest, stateRef],
  );

  const handlers = useMemo<ExerciseHandlers>(
    () => ({
      onEdit: actions.editSet,
      onBlur: actions.flushSet,
      onToggle,
      onCopy: (exerciseId, setId, anterior) => {
        selection();
        actions.copyToSet(exerciseId, setId, anterior);
      },
      onDelete: actions.removeSet,
      onMenu: (exerciseId, setId) => {
        setTarget({ exerciseId, setId });
        setSheet('setMenu');
      },
      onAddSet: actions.addSet,
      onExerciseMenu: (exerciseId) => {
        setTarget({ exerciseId, setId: null });
        setSheet('exerciseMenu');
      },
    }),
    [actions, onToggle],
  );

  const openPicker = useCallback((mode: 'multi' | 'single') => {
    setPickerMode(mode);
    setSheet('picker');
  }, []);

  const onPick = useCallback(
    (names: string[]) => {
      setSheet(null);
      if (names.length === 0) return;
      if (pickerMode === 'single') {
        if (target.exerciseId) actions.patchExercise(target.exerciseId, { name: names[0] });
        return;
      }
      const counts = names.map((name) => Math.min(10, previousSession(historyRef.current, name)?.length ?? 1));
      actions.addExercises(names, counts);
    },
    [actions, pickerMode, target.exerciseId],
  );

  const complete = useCallback(
    async (doneIds: string[], dropIds: string[]) => {
      setBusy(true);
      setSheet(null);
      try {
        await actions.finish(doneIds, dropIds);
        stopRest();
        const state = stateRef.current;
        setSummary(summarizeSession(state.exercises, historyRef.current, state.workout?.durationMinutes ?? 1));
        setSheet('summary');
      } catch (error) {
        console.error(error);
        toast.show({ message: 'No se ha podido terminar el entreno. Inténtalo otra vez.', kind: 'error' });
      } finally {
        setBusy(false);
      }
    },
    [actions, stateRef, stopRest],
  );

  // Las series vacías se descartan sin preguntar; si no queda ninguna hecha, se ofrece descartar.
  const proceed = useCallback(
    (doneIds: string[], dropIds: string[]) => {
      if (planFinish(stateRef.current.exercises).done + doneIds.length === 0) {
        setSheet('confirmEmpty');
        return;
      }
      void complete(doneIds, dropIds);
    },
    [complete, stateRef],
  );

  const requestFinish = useCallback(async () => {
    if (busy) return;
    await actions.flushAll();
    const plan = planFinish(stateRef.current.exercises);
    if (plan.unticked.length) {
      setUntickedCount(plan.unticked.length);
      setSheet('unticked');
      return;
    }
    proceed([], plan.empty);
  }, [actions, busy, proceed, stateRef]);

  const onUnticked = useCallback(
    (choice: UntickedChoice) => {
      if (choice === 'keep') {
        setSheet(null);
        return;
      }
      const plan = planFinish(stateRef.current.exercises);
      if (choice === 'mark') proceed(plan.unticked, plan.empty);
      else proceed([], [...plan.unticked, ...plan.empty]);
    },
    [proceed, stateRef],
  );

  const discard = useCallback(async () => {
    setSheet(null);
    setBusy(true);
    try {
      stopRest();
      await actions.discard();
      toast.show({ message: liveRef.current ? 'Entreno descartado' : 'Entreno eliminado' });
      close();
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha podido borrar el entreno.', kind: 'error' });
    } finally {
      setBusy(false);
    }
  }, [actions, close, stopRest]);

  const onWorkoutMenu = useCallback(
    (key: string) => {
      if (key === 'meta') setSheet('workoutMeta');
      else if (key === 'rest') {
        setSheet(null);
        toggleRest();
      } else if (key === 'later') {
        setSheet(null);
        close();
      } else if (key === 'discard') setSheet('confirmDiscard');
    },
    [close, toggleRest],
  );

  const onExerciseMenu = useCallback(
    (key: string) => {
      const id = target.exerciseId;
      if (!id) return setSheet(null);
      if (key === 'up' || key === 'down') {
        setSheet(null);
        actions.moveExercise(id, key === 'up' ? -1 : 1);
      } else if (key === 'replace') openPicker('single');
      else if (key === 'notes') setSheet('exerciseNotes');
      else if (key === 'remove') {
        setSheet(null);
        actions.removeExercise(id);
      }
    },
    [actions, openPicker, target.exerciseId],
  );

  const onSetMenu = useCallback(
    (key: string) => {
      setSheet(null);
      if (key === 'remove' && target.exerciseId && target.setId) actions.removeSet(target.exerciseId, target.setId);
    },
    [actions, target.exerciseId, target.setId],
  );

  const onSummaryDone = useCallback(() => {
    setSheet(null);
    close();
  }, [close]);

  const onSaveRoutine = useCallback(() => {
    setSheet(null);
    saveAsRoutine();
  }, [saveAsRoutine]);

  return {
    sheet,
    setSheet,
    closeSheet,
    target,
    pickerMode,
    untickedCount,
    summary,
    busy,
    handlers,
    openPicker,
    onPick,
    requestFinish,
    onUnticked,
    discard,
    onWorkoutMenu,
    onExerciseMenu,
    onSetMenu,
    onSummaryDone,
    onSaveRoutine,
  };
};

export type SessionFlow = ReturnType<typeof useSessionFlow>;

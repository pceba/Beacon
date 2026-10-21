import React, { useMemo } from 'react';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { Sheet } from '../../../components/ui/Sheet';
import { SessionFlow } from '../hooks/useSessionFlow';
import { formatNumber } from '../../../utils/format';
import { SessionState } from '../sessionReducer';
import { ActionMenu, MenuItem } from './ActionMenu';
import { ExercisePicker } from './ExercisePicker';
import { SummaryContent, UntickedContent } from './FinishSheets';
import { MetaSheet } from './MetaSheet';

type Props = {
  flow: SessionFlow;
  state: SessionState;
  live: boolean;
  restSeconds: number;
  onSaveMeta: (name: string, notes: string) => void;
  onSaveExerciseNotes: (exerciseId: string, notes: string) => void;
};

const SET_MENU: MenuItem[] = [{ key: 'remove', label: 'Eliminar serie', danger: true }];

// Todas las hojas de la sesión. Su contenido se pinta en SheetHost, fuera de la pantalla.
export const SessionSheets = ({ flow, state, live, restSeconds, onSaveMeta, onSaveExerciseNotes }: Props) => {
  const { sheet, closeSheet, target } = flow;
  const index = state.exercises.findIndex((exercise) => exercise.id === target.exerciseId);
  const exercise = index >= 0 ? state.exercises[index] : null;
  const count = state.exercises.length;
  const workout = state.workout;

  const workoutMenu = useMemo<MenuItem[]>(
    () =>
      live
        ? [
            { key: 'meta', label: 'Editar nombre y notas' },
            { key: 'rest', label: restSeconds > 0 ? `Descanso: ${formatNumber(restSeconds)} s` : 'Sin descanso' },
            { key: 'later', label: 'Seguir más tarde' },
            { key: 'discard', label: 'Descartar entreno', danger: true },
          ]
        : [
            { key: 'meta', label: 'Editar nombre y notas' },
            { key: 'discard', label: 'Eliminar entreno', danger: true },
          ],
    [live, restSeconds],
  );

  const exerciseMenu = useMemo<MenuItem[]>(
    () => [
      { key: 'up', label: 'Subir', disabled: index <= 0 },
      { key: 'down', label: 'Bajar', disabled: index < 0 || index >= count - 1 },
      { key: 'replace', label: 'Reemplazar' },
      { key: 'notes', label: 'Notas' },
      { key: 'remove', label: 'Eliminar ejercicio', danger: true },
    ],
    [count, index],
  );

  return (
    <>
      <Sheet visible={sheet === 'workoutMenu'} onClose={closeSheet} label="Opciones del entreno">
        <ActionMenu items={workoutMenu} onSelect={flow.onWorkoutMenu} />
      </Sheet>
      <Sheet visible={sheet === 'exerciseMenu'} onClose={closeSheet} label="Opciones del ejercicio">
        <ActionMenu title={exercise?.name} items={exerciseMenu} onSelect={flow.onExerciseMenu} />
      </Sheet>
      <Sheet visible={sheet === 'setMenu'} onClose={closeSheet} label="Opciones de la serie">
        <ActionMenu items={SET_MENU} onSelect={flow.onSetMenu} />
      </Sheet>
      <Sheet visible={sheet === 'exerciseNotes'} onClose={closeSheet} label="Notas del ejercicio">
        <MetaSheet
          title={exercise?.name ?? 'Notas'}
          notes={exercise?.notes ?? ''}
          onSave={(_name, notes) => {
            closeSheet();
            if (exercise) onSaveExerciseNotes(exercise.id, notes);
          }}
        />
      </Sheet>
      <Sheet visible={sheet === 'workoutMeta'} onClose={closeSheet} label="Nombre y notas">
        <MetaSheet
          title="Nombre y notas"
          name={workout?.name ?? ''}
          notes={workout?.notes ?? ''}
          onSave={(name, notes) => {
            closeSheet();
            onSaveMeta(name, notes);
          }}
        />
      </Sheet>
      <Sheet visible={sheet === 'picker'} onClose={closeSheet} fullHeight label="Elegir ejercicios">
        <ExercisePicker mode={flow.pickerMode} onConfirm={flow.onPick} />
      </Sheet>
      <ConfirmSheet
        visible={sheet === 'confirmDiscard'}
        title={live ? '¿Descartar el entreno?' : '¿Eliminar el entreno?'}
        body="Se borran sus ejercicios y series."
        confirmLabel={live ? 'Descartar' : 'Eliminar'}
        onConfirm={() => void flow.discard()}
        onClose={closeSheet}
      />
      <ConfirmSheet
        visible={sheet === 'confirmEmpty'}
        title="¿Descartar el entreno vacío?"
        body="No has marcado ninguna serie como hecha."
        confirmLabel="Descartar"
        onConfirm={() => void flow.discard()}
        onClose={closeSheet}
      />
      <Sheet visible={sheet === 'unticked'} onClose={closeSheet} label="Series sin marcar">
        <UntickedContent count={flow.untickedCount} onChoose={flow.onUnticked} />
      </Sheet>
      <Sheet visible={sheet === 'summary'} onClose={flow.onSummaryDone} label="Entreno terminado">
        {flow.summary ? <SummaryContent summary={flow.summary} onSaveRoutine={flow.onSaveRoutine} onDone={flow.onSummaryDone} /> : null}
      </Sheet>
    </>
  );
};

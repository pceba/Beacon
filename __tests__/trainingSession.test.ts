import {
  draftFromSet,
  ExerciseDraft,
  exercisesLeftEmpty,
  newExerciseDraft,
  newSetAfter,
  planFinish,
  sessionReducer,
  SessionState,
  SetDraft,
  setValues,
} from '../features/training/sessionReducer';
import { durationMinutes, formatElapsed, formatRest, parseDecimal, sanitizeDecimal, toReps, toWeightKg } from '../features/training/numbers';
import { createWriteQueue } from '../features/training/writeQueue';

const set = (id: string, weight: string, reps: string, completed = false, proposed = false): SetDraft => ({
  id,
  number: Number(id.replace(/\D/g, '')) || 1,
  weight,
  reps,
  completed,
  proposed,
});

const exercise = (id: string, sets: SetDraft[], name = 'Sentadilla'): ExerciseDraft => ({ id, name, notes: null, sets });

const base = (): SessionState => ({
  workout: { id: 'w', name: 'Pierna', notes: null, startedAt: '2026-10-21T10:00:00.000Z', completed: false, durationMinutes: null },
  exercises: [exercise('a', [set('s1', '80', '5', true), set('s2', '80', '5', false, true)]), exercise('b', [set('s3', '', '')], 'Press banca')],
});

describe('numbers', () => {
  it('acepta coma o punto y muestra coma', () => {
    expect(sanitizeDecimal('82.55x')).toBe('82,55');
    expect(sanitizeDecimal('1,2,3')).toBe('1,23');
    expect(sanitizeDecimal('8,5', 0)).toBe('85');
    expect(parseDecimal('82,5')).toBe(82.5);
    expect(parseDecimal('')).toBeNull();
  });

  it('ajusta a las columnas de la base', () => {
    expect(toWeightKg('1234')).toBe(999.99);
    expect(toWeightKg('82,555')).toBe(82.56);
    expect(toReps('8,6')).toBe(9);
  });

  it('formatea cronómetro, descanso y duración', () => {
    expect(formatElapsed(65)).toBe('01:05');
    expect(formatElapsed(3725)).toBe('1:02:05');
    expect(formatRest(84)).toBe('1:24');
    const start = '2026-10-21T10:00:00.000Z';
    expect(durationMinutes(start, Date.parse(start) + 10_000)).toBe(1);
    expect(durationMinutes(start, Date.parse(start) + 52 * 60_000)).toBe(52);
  });
});

describe('sessionReducer', () => {
  it('editar quita el gris y no toca los demás ejercicios', () => {
    const state = base();
    const next = sessionReducer(state, { type: 'editSet', exerciseId: 'a', setId: 's2', field: 'weight', text: '85' });
    expect(next.exercises[0].sets[1]).toMatchObject({ weight: '85', proposed: false });
    expect(next.exercises[1]).toBe(state.exercises[1]);
  });

  it('mueve ejercicios y no sale de los extremos', () => {
    const state = base();
    expect(sessionReducer(state, { type: 'moveExercise', exerciseId: 'b', delta: -1 }).exercises.map((item) => item.id)).toEqual(['b', 'a']);
    expect(sessionReducer(state, { type: 'moveExercise', exerciseId: 'a', delta: -1 })).toBe(state);
  });

  it('quita y vuelve a poner una serie en su sitio', () => {
    const state = base();
    const removed = sessionReducer(state, { type: 'removeSet', exerciseId: 'a', setId: 's1' });
    expect(removed.exercises[0].sets.map((item) => item.id)).toEqual(['s2']);
    const back = sessionReducer(removed, { type: 'insertSet', exerciseId: 'a', set: state.exercises[0].sets[0], index: 0 });
    expect(back.exercises[0].sets.map((item) => item.id)).toEqual(['s1', 's2']);
    const again = sessionReducer(back, { type: 'insertSet', exerciseId: 'a', set: state.exercises[0].sets[0] });
    expect(again.exercises[0]).toBe(back.exercises[0]);
  });

  it('una serie nueva copia la anterior en gris y numera después', () => {
    const next = newSetAfter(base().exercises[0], 'n');
    expect(next).toMatchObject({ id: 'n', number: 3, weight: '80', reps: '5', completed: false, proposed: true });
    expect(newSetAfter(exercise('x', []), 'n')).toMatchObject({ number: 1, weight: '', proposed: false });
    expect(newExerciseDraft('e', 'Remo', ['1', '2']).sets.map((item) => item.number)).toEqual([1, 2]);
  });

  it('terminar marca, descarta y quita ejercicios vacíos', () => {
    const state = base();
    const plan = planFinish(state.exercises);
    expect(plan).toEqual({ unticked: ['s2'], empty: ['s3'], done: 1 });
    expect(exercisesLeftEmpty(state.exercises, plan.empty)).toEqual(['b']);
    const next = sessionReducer(state, { type: 'finish', doneIds: plan.unticked, dropIds: plan.empty });
    expect(next.workout?.completed).toBe(true);
    expect(next.exercises.map((item) => item.id)).toEqual(['a']);
    expect(next.exercises[0].sets.every((item) => item.completed && !item.proposed)).toBe(true);
  });

  it('convierte filas y valores', () => {
    const draft = draftFromSet({ id: 'r', exercise_id: 'a', set_number: 2, reps: 5, weight_kg: 82.5, duration_seconds: null, completed: false });
    expect(draft).toMatchObject({ weight: '82,5', reps: '5', proposed: true });
    expect(setValues(draft)).toEqual({ weight_kg: 82.5, reps: 5, completed: false });
  });
});

describe('createWriteQueue', () => {
  it('escribe en orden y deshace solo lo que falla', async () => {
    const order: string[] = [];
    const rolled: string[] = [];
    const errors: unknown[] = [];
    const queue = createWriteQueue((error) => errors.push(error));
    const slow = (name: string, ms: number, fail = false) => async () => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      order.push(name);
      if (fail) throw new Error(name);
    };
    void queue.run(slow('a', 20));
    void queue.run(slow('b', 0, true), () => rolled.push('b'));
    void queue.run(slow('c', 5), () => rolled.push('c'));
    expect(queue.pending()).toBe(3);
    await queue.idle();
    expect(order).toEqual(['a', 'b', 'c']);
    expect(rolled).toEqual(['b']);
    expect(errors).toHaveLength(1);
    expect(queue.pending()).toBe(0);
  });
});

import { EXERCISE_CATALOG } from '../features/training/catalog';
import { buildPickerRows, foldText, recentExerciseNames, selectionIndex, toggleSelection } from '../features/training/exerciseSearch';
import { anteriorRows, draftVolume, historyBefore, previousSession, prSetIds, rowsVolume, summarizeSession } from '../features/training/sessionMath';
import { ExerciseDraft, SetDraft } from '../features/training/sessionReducer';
import { LoggedExercise } from '../utils/exerciseProgress';

const logged = (workoutId: string, performedAt: string, name: string, sets: Array<[number | null, number | null, boolean?]>): LoggedExercise => ({
  workoutId,
  performedAt,
  name,
  sets: sets.map(([weightKg, reps, completed = true], index) => ({ weightKg, reps, completed, order: index + 1 })),
});

const draftSet = (id: string, weight: string, reps: string, completed = true): SetDraft => ({ id, number: 1, weight, reps, completed, proposed: false });

describe('búsqueda del selector', () => {
  it('ignora tildes y mayúsculas', () => {
    expect(foldText('  Extensión de TRÍCEPS ')).toBe('extension de triceps');
    const rows = buildPickerRows({ query: 'tricep', recents: [], catalog: EXERCISE_CATALOG });
    expect(rows[0]).toMatchObject({ kind: 'create', name: 'Tricep' });
    expect(rows.some((row) => row.kind === 'item' && row.name === 'Extensión de tríceps')).toBe(true);
  });

  it('no ofrece crear si hay coincidencia exacta', () => {
    const rows = buildPickerRows({ query: 'PRESS BANCA', recents: [], catalog: EXERCISE_CATALOG });
    expect(rows[0]).toMatchObject({ kind: 'item', name: 'Press banca' });
    expect(rows.some((row) => row.kind === 'create')).toBe(false);
  });

  it('sin texto muestra nuevos, recientes y grupos', () => {
    const rows = buildPickerRows({ query: '', recents: ['Sentadilla'], catalog: EXERCISE_CATALOG, selected: ['Mi ejercicio'] });
    const headers = rows.filter((row) => row.kind === 'header').map((row) => (row.kind === 'header' ? row.title : ''));
    expect(headers).toEqual(['Nuevos', 'Recientes', 'Pierna', 'Empuje', 'Tirón', 'Core', 'Calistenia']);
    expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length);
  });

  it('recientes del más nuevo al más viejo, sin repetir', () => {
    const entries = [
      logged('w1', '2026-10-01T10:00:00Z', 'Sentadilla', []),
      logged('w2', '2026-10-08T10:00:00Z', ' sentadilla ', []),
      logged('w2', '2026-10-08T10:00:00Z', 'Press banca', []),
    ];
    expect(recentExerciseNames(entries)).toEqual(['sentadilla', 'Press banca']);
  });

  it('la selección guarda el orden y alterna', () => {
    let selected = toggleSelection([], 'Remo');
    selected = toggleSelection(selected, 'Fondos');
    expect(selectionIndex(selected, 'fondos')).toBe(1);
    expect(toggleSelection(selected, 'REMO')).toEqual(['Fondos']);
  });
});

describe('volumen, récords y resumen', () => {
  const history = [logged('old', '2026-10-01T10:00:00Z', 'Sentadilla', [[80, 5], [80, 5]])];

  it('suma peso × reps de las series hechas', () => {
    expect(rowsVolume([{ weight_kg: 80, reps: 5, completed: true }, { weight_kg: 100, reps: 5, completed: false }, { weight_kg: null, reps: 8, completed: true }])).toBe(400);
    const exercises: ExerciseDraft[] = [{ id: 'e', name: 'Sentadilla', notes: null, sets: [draftSet('a', '82,5', '5'), draftSet('b', '80', '5', false)] }];
    expect(draftVolume(exercises)).toBe(412.5);
  });

  it('detecta récords en orden y resume la sesión', () => {
    const sets = [draftSet('a', '82,5', '5'), draftSet('b', '82,5', '5'), draftSet('c', '85', '5')];
    expect(prSetIds(sets, 80 * (1 + 5 / 30))).toEqual(['a', 'c']);
    expect(prSetIds(sets, null)).toEqual([]);
    const summary = summarizeSession([{ id: 'e', name: 'sentadilla', notes: null, sets }], history, 52);
    expect(summary).toMatchObject({ durationMinutes: 52, setsDone: 3, volumeKg: 1250 });
    expect(summary.prs).toEqual([{ exerciseId: 'e', name: 'sentadilla', weightKg: 85, reps: 5 }]);
  });
});

describe('«Anterior»', () => {
  const entries = [
    logged('w1', '2026-10-01T10:00:00Z', 'Press banca', [[60, 8]]),
    logged('w2', '2026-10-08T10:00:00Z', 'Press banca', [[62.5, 8], [62.5, 7], [null, 6, false]]),
    logged('now', '2026-10-21T10:00:00Z', 'Press banca', [[70, 5]]),
  ];

  it('usa la última sesión anterior y por posición', () => {
    const history = historyBefore(entries, 'now', '2026-10-21T10:00:00Z');
    const rows = anteriorRows(previousSession(history, 'press banca'));
    expect(rows.map((row) => row.label)).toEqual(['62,5 × 8', '62,5 × 7']);
    expect(rows[1]).toEqual({ label: '62,5 × 7', weight: '62,5', reps: '7' });
  });

  it('sin historial no hay filas', () => {
    expect(anteriorRows(previousSession([], 'Remo'))).toEqual([]);
  });

  it('si no se marcó ninguna serie, usa todas', () => {
    const rows = anteriorRows(previousSession([logged('w', '2026-10-01T10:00:00Z', 'Dominadas', [[null, 8, false]])], 'Dominadas'));
    expect(rows.map((row) => row.label)).toEqual(['× 8']);
  });
});

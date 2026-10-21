import { blankQuery, executeQuery, LocalQuery, Tables } from '../lib/localQuery';

const query = (over: Partial<LocalQuery>): LocalQuery => ({ ...blankQuery(), ...over });

const seed = (): Tables =>
  new Map([
    [
      'events',
      [
        { id: 'e1', user_id: 'u', title: 'Dentista', event_date: '2026-10-21', event_time: '10:00:00' },
        { id: 'e2', user_id: 'u', title: 'Cumple', event_date: '2026-10-21', event_time: null },
        { id: 'e3', user_id: 'u', title: 'Tren', event_date: '2026-10-24', event_time: '08:15:00' },
        { id: 'e4', user_id: 'otro', title: 'Ajeno', event_date: '2026-10-21', event_time: '09:00:00' },
      ],
    ],
  ]);

describe('executeQuery · select', () => {
  it('filtra por rango de fechas, usuario y ordena con nulos primero', () => {
    const { result } = executeQuery(
      seed(),
      'events',
      query({
        op: 'select',
        filters: [
          { op: 'eq', col: 'user_id', value: 'u' },
          { op: 'gte', col: 'event_date', value: '2026-10-20' },
          { op: 'lte', col: 'event_date', value: '2026-10-22' },
        ],
        order: [
          { col: 'event_date', ascending: true },
          { col: 'event_time', ascending: true, nullsFirst: true },
        ],
      }),
    );
    expect((result.data as Array<{ id: string }>).map((row) => row.id)).toEqual(['e2', 'e1']);
  });

  it('por defecto los nulos van al final en orden ascendente, como Postgres', () => {
    const { result } = executeQuery(seed(), 'events', query({ op: 'select', order: [{ col: 'event_time', ascending: true }] }));
    expect((result.data as Array<{ id: string }>).map((row) => row.id)).toEqual(['e3', 'e4', 'e1', 'e2']);
  });

  it('soporta in, neq, is, lt/gt, range, limit y columnas', () => {
    const tables = seed();
    const run = (over: Partial<LocalQuery>) => executeQuery(tables, 'events', query({ op: 'select', ...over })).result.data as Array<Record<string, unknown>>;
    expect(run({ filters: [{ op: 'in', col: 'id', value: ['e1', 'e3'] }] })).toHaveLength(2);
    expect(run({ filters: [{ op: 'neq', col: 'user_id', value: 'u' }] })).toHaveLength(1);
    expect(run({ filters: [{ op: 'is', col: 'event_time', value: null }] })).toHaveLength(1);
    expect(run({ filters: [{ op: 'gt', col: 'event_date', value: '2026-10-21' }, { op: 'lt', col: 'event_date', value: '2026-10-30' }] })).toHaveLength(1);
    expect(run({ order: [{ col: 'id', ascending: true }], range: { from: 1, to: 2 } }).map((row) => row.id)).toEqual(['e2', 'e3']);
    expect(run({ order: [{ col: 'id', ascending: false }], limit: 1 }).map((row) => row.id)).toEqual(['e4']);
    expect(run({ columns: 'id, title', limit: 1, order: [{ col: 'id', ascending: true }] })).toEqual([{ id: 'e1', title: 'Dentista' }]);
  });

  it('single falla si no hay exactamente una fila; maybeSingle acepta ninguna', () => {
    const tables = seed();
    const none = [{ op: 'eq' as const, col: 'id', value: 'nope' }];
    expect(executeQuery(tables, 'events', query({ op: 'select', filters: none, single: true })).result.error).toBeTruthy();
    expect(executeQuery(tables, 'events', query({ op: 'select', filters: none, maybeSingle: true })).result).toEqual({ data: null, error: null });
  });

  it('un operador que no sabe hacer en local devuelve error en vez de datos falsos', () => {
    const { result } = executeQuery(seed(), 'events', query({ op: 'select', unsupported: 'or' }));
    expect(result.error).toBeTruthy();
    expect(result.data).toBeNull();
  });

  it('compara timestamps por instante aunque cambie la zona escrita', () => {
    const tables: Tables = new Map([['workouts', [{ id: 'w', started_at: '2026-10-21T01:00:00+02:00' }]]]);
    const { result } = executeQuery(tables, 'workouts', query({ op: 'select', filters: [{ op: 'gte', col: 'started_at', value: '2026-10-20T23:00:00.000Z' }] }));
    expect(result.data).toHaveLength(1);
  });
});

describe('executeQuery · escrituras', () => {
  it('inserta varias filas con id y devuelve solo si se pidió select', () => {
    const tables: Tables = new Map();
    const silent = executeQuery(tables, 'tasks', query({ op: 'insert', payload: [{ title: 'A' }, { title: 'B' }] }));
    expect(silent.result.data).toBeNull();
    expect(silent.changed).toEqual(['tasks']);
    const rows = tables.get('tasks') ?? [];
    expect(rows).toHaveLength(2);
    expect(typeof rows[0].id).toBe('string');
    expect(rows[0].created_at).toBeTruthy();
    const loud = executeQuery(tables, 'tasks', query({ op: 'insert', payload: { title: 'C' }, returning: true, single: true }));
    expect((loud.result.data as { title: string }).title).toBe('C');
  });

  it('borrar un entreno borra sus ejercicios y series en cascada', () => {
    const tables: Tables = new Map([
      ['workouts', [{ id: 'w1' }, { id: 'w2' }]],
      ['workout_exercises', [{ id: 'x1', workout_id: 'w1' }, { id: 'x2', workout_id: 'w2' }]],
      ['workout_sets', [{ id: 's1', exercise_id: 'x1' }, { id: 's2', exercise_id: 'x2' }]],
    ]);
    const { changed } = executeQuery(tables, 'workouts', query({ op: 'delete', filters: [{ op: 'eq', col: 'id', value: 'w1' }] }));
    expect(changed.sort()).toEqual(['workout_exercises', 'workout_sets', 'workouts']);
    expect(tables.get('workout_exercises')).toEqual([{ id: 'x2', workout_id: 'w2' }]);
    expect(tables.get('workout_sets')).toEqual([{ id: 's2', exercise_id: 'x2' }]);
  });

  it('borrar una rutina deja sus entrenos sin rutina', () => {
    const tables: Tables = new Map([
      ['workout_templates', [{ id: 't1' }]],
      ['workout_template_exercises', [{ id: 'te', template_id: 't1' }]],
      ['workouts', [{ id: 'w1', template_id: 't1' }]],
    ]);
    executeQuery(tables, 'workout_templates', query({ op: 'delete', filters: [{ op: 'eq', col: 'id', value: 't1' }] }));
    expect(tables.get('workout_template_exercises')).toEqual([]);
    expect(tables.get('workouts')).toEqual([{ id: 'w1', template_id: null }]);
  });

  it('upsert fusiona por la clave de conflicto', () => {
    const tables: Tables = new Map();
    const upsert = (amount: number) =>
      executeQuery(
        tables,
        'water_logs',
        query({ op: 'upsert', payload: { user_id: 'u', log_date: '2026-10-21', amount_ml: amount }, onConflict: 'user_id,log_date', returning: true, single: true }),
      ).result.data as { id: string; amount_ml: number };
    const first = upsert(250);
    const second = upsert(750);
    expect(tables.get('water_logs')).toHaveLength(1);
    expect(second.id).toBe(first.id);
    expect(second.amount_ml).toBe(750);
  });

  it('update solo toca las filas filtradas', () => {
    const tables = seed();
    executeQuery(tables, 'events', query({ op: 'update', payload: { title: 'Cambiado' }, filters: [{ op: 'eq', col: 'user_id', value: 'otro' }] }));
    expect((tables.get('events') ?? []).filter((row) => row.title === 'Cambiado').map((row) => row.id)).toEqual(['e4']);
  });
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { blankQuery } from '../lib/localQuery';
import { flushLocalStore, readLocalDb, removeLocalRows, resetLocalStoreForTests, runLocalQuery } from '../lib/localStore';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const select = (over = {}) => ({ ...blankQuery(), op: 'select' as const, ...over });

beforeEach(async () => {
  await AsyncStorage.clear();
  resetLocalStoreForTests();
});

describe('localStore', () => {
  it('migra la clave única antigua a una clave por tabla y la borra', async () => {
    await AsyncStorage.setItem(
      'lifepp_local_db',
      JSON.stringify({ tasks: [{ id: 't1', title: 'A' }], water_logs: [{ id: 'w1', amount_ml: 250 }], empty: [] }),
    );
    const { data } = await runLocalQuery('tasks', select());
    expect(data).toEqual([{ id: 't1', title: 'A' }]);
    expect(await AsyncStorage.getItem('lifepp_local_db')).toBeNull();
    expect(JSON.parse((await AsyncStorage.getItem('lifepp_local_db:tasks')) as string)).toEqual([{ id: 't1', title: 'A' }]);
    expect(JSON.parse((await AsyncStorage.getItem('lifepp_local_db:__tables')) as string).sort()).toEqual(['tasks', 'water_logs']);
  });

  it('también migra la clave de Capalot (al arrancar)', async () => {
    // La migración de nombres corre una vez por arranque: módulos nuevos = arranque nuevo.
    let storage: typeof AsyncStorage | undefined;
    let fresh: typeof import('../lib/localStore') | undefined;
    jest.isolateModules(() => {
      storage = require('@react-native-async-storage/async-storage');
      fresh = require('../lib/localStore');
    });
    await storage!.setItem('capalot_local_db', JSON.stringify({ notes: [{ id: 'n1' }] }));
    expect((await fresh!.runLocalQuery('notes', select())).data).toEqual([{ id: 'n1' }]);
    expect(await storage!.getItem('capalot_local_db')).toBeNull();
  });

  it('guarda solo las tablas cambiadas y sobrevive a un reinicio', async () => {
    await runLocalQuery('tasks', { ...blankQuery(), op: 'insert', payload: { title: 'Nueva' } });
    expect(await AsyncStorage.getItem('lifepp_local_db:tasks')).toBeNull();
    await flushLocalStore();
    const stored = JSON.parse((await AsyncStorage.getItem('lifepp_local_db:tasks')) as string);
    expect(stored).toHaveLength(1);
    expect(await AsyncStorage.getItem('lifepp_local_db:events')).toBeNull();

    resetLocalStoreForTests();
    const { data } = await runLocalQuery('tasks', select());
    expect((data as Array<{ title: string }>)[0].title).toBe('Nueva');
  });

  it('removeLocalRows borra la tabla vacía del almacenamiento', async () => {
    await runLocalQuery('tasks', { ...blankQuery(), op: 'insert', payload: { id: 'x', title: 'A' } });
    await flushLocalStore();
    await removeLocalRows('tasks', ['x']);
    await flushLocalStore();
    expect(await AsyncStorage.getItem('lifepp_local_db:tasks')).toBeNull();
    expect(await readLocalDb()).toEqual({});
  });

  it('readLocalDb devuelve una copia', async () => {
    await runLocalQuery('tasks', { ...blankQuery(), op: 'insert', payload: { id: 'x', title: 'A' } });
    const snapshot = await readLocalDb();
    snapshot.tasks.push({ id: 'y' });
    expect((await runLocalQuery('tasks', select())).data).toHaveLength(1);
  });
});

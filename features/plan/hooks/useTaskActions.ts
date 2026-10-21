import { useMemo } from 'react';
import { QueryKey } from '@tanstack/react-query';
import { invalidateTables, queryClient } from '../../../lib/query';
import { toast } from '../../../lib/toast';
import { getCurrentUserId } from '../../../services/authService';
import { createTask, deleteTask, updateTask } from '../../../services/taskService';
import { Task } from '../../../types/database';

const isTaskList = (data: unknown): data is Task[] => Array.isArray(data);

// Cambia al momento todas las listas de tareas en caché y devuelve cómo volver atrás.
const patchTasks = async (change: (list: Task[], key: QueryKey) => Task[]) => {
  await queryClient.cancelQueries({ queryKey: ['tasks'] });
  const snapshot = queryClient.getQueriesData<Task[]>({ queryKey: ['tasks'] });
  snapshot.forEach(([key, data]) => {
    if (isTaskList(data)) queryClient.setQueryData<Task[]>(key, change(data, key));
  });
  return () => snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
};

const setCompleted = (id: string, completed: boolean) => (list: Task[]) =>
  list.map((item) => (item.id === id ? { ...item, completed } : item));

// Lista con fecha cuyo rango incluye el día: ['tasks', 'deadline', from, to].
const coversDay = (key: QueryKey, day: string) =>
  key[1] === 'deadline' && typeof key[2] === 'string' && typeof key[3] === 'string' && key[2] <= day && day <= key[3];

// Vuelve a poner una tarea borrada en las listas donde estaba (Deshacer).
const reinsert = (task: Task) => (list: Task[], key: QueryKey) => {
  const belongs = key[1] === 'open' ? !task.completed : coversDay(key, task.deadline?.slice(0, 10) ?? '');
  return belongs ? [task, ...list] : list;
};

const payloadOf = (task: Task) => ({
  title: task.title,
  description: task.description,
  deadline: task.deadline,
  completed: task.completed,
  priority: task.priority,
});

const toggle = async (task: Task) => {
  const completed = !task.completed;
  const restore = await patchTasks(setCompleted(task.id, completed));
  try {
    const userId = await getCurrentUserId();
    await updateTask(userId, task.id, { completed });
    if (completed) {
      toast.show({
        message: 'Tarea hecha',
        action: {
          label: 'Deshacer',
          onPress: () => {
            void patchTasks(setCompleted(task.id, false));
            updateTask(userId, task.id, { completed: false })
              .catch((error) => {
                console.error(error);
                toast.show({ message: 'No se ha podido deshacer.', kind: 'error' });
              })
              .finally(() => void invalidateTables('tasks'));
          },
        },
      });
    }
  } catch (error) {
    console.error(error);
    restore();
    toast.show({ message: 'No se ha actualizado la tarea.', kind: 'error' });
  } finally {
    void invalidateTables('tasks');
  }
};

const remove = async (task: Task) => {
  const restore = await patchTasks((list) => list.filter((item) => item.id !== task.id));
  try {
    const userId = await getCurrentUserId();
    await deleteTask(userId, task.id);
    toast.show({
      message: 'Tarea eliminada',
      action: {
        label: 'Deshacer',
        onPress: () => {
          void patchTasks(reinsert(task));
          createTask(userId, payloadOf(task))
            .catch((error) => {
              console.error(error);
              toast.show({ message: 'No se ha podido recuperar la tarea.', kind: 'error' });
            })
            .finally(() => void invalidateTables('tasks'));
        },
      },
    });
  } catch (error) {
    console.error(error);
    restore();
    toast.show({ message: 'No se ha podido eliminar.', kind: 'error' });
  } finally {
    void invalidateTables('tasks');
  }
};

// Devuelve false si no se ha guardado, para devolver el texto al campo.
const add = async (title: string, day: string): Promise<boolean> => {
  const draft: Task = {
    id: `draft-${Date.now()}`,
    user_id: '',
    title,
    description: null,
    deadline: day,
    completed: false,
    priority: 'medium',
    created_at: new Date().toISOString(),
  };
  const restore = await patchTasks((list, key) => (coversDay(key, day) ? [draft, ...list] : list));
  try {
    const userId = await getCurrentUserId();
    const created = await createTask(userId, payloadOf(draft));
    queryClient.setQueriesData<Task[]>({ queryKey: ['tasks'] }, (list) =>
      isTaskList(list) ? list.map((item) => (item.id === draft.id ? created : item)) : list,
    );
    return true;
  } catch (error) {
    console.error(error);
    restore();
    toast.show({ message: 'No se ha guardado la tarea.', kind: 'error' });
    return false;
  } finally {
    void invalidateTables('tasks');
  }
};

// Acciones de tarea compartidas por Día y Lista (estables: se pasan a filas memorizadas).
export const useTaskActions = () => useMemo(() => ({ toggle, remove, add }), []);

export type TaskActions = ReturnType<typeof useTaskActions>;

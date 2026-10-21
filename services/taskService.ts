import { supabase } from '../lib/supabase';
import { Task } from '../types/database';

export const getTasks = async (userId: string): Promise<Task[]> => {
  const { data, error } = await supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Task[];
};

// Pendientes, con o sin fecha (Hoy y la lista de Plan).
export const getOpenTasks = async (userId: string): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('completed', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Task[];
};

// Con fecha dentro del periodo ('yyyy-MM-dd', inclusivo), hechas o no (calendario).
export const getTasksByDeadline = async (userId: string, from: string, to: string): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .gte('deadline', from)
    .lte('deadline', to)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Task[];
};

export const createTask = async (
  userId: string,
  payload: Omit<Task, 'id' | 'user_id' | 'created_at'>,
): Promise<Task> => {
  const { data, error } = await supabase.from('tasks').insert({ user_id: userId, ...payload }).select('*').single();
  if (error) throw error;
  return data as Task;
};

export const updateTask = async (
  userId: string,
  id: string,
  payload: Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>,
): Promise<Task> => {
  const { data, error } = await supabase.from('tasks').update(payload).eq('user_id', userId).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Task;
};

export const deleteTask = async (userId: string, id: string): Promise<void> => {
  const { error } = await supabase.from('tasks').delete().eq('user_id', userId).eq('id', id);
  if (error) throw error;
};

export const toggleTaskCompleted = async (userId: string, task: Task): Promise<Task> => {
  return updateTask(userId, task.id, { completed: !task.completed });
};

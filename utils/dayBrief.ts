// Resumen del día calculado en el dispositivo: sin red, sin coste y para todos.
// (La revisión con Claude va por el conector MCP, desde claude.ai.)

import { formatWater } from './format';

type BriefTask = { title: string; deadline: string | null; completed: boolean };

export type BriefInput = {
  todayKey: string; // yyyy-MM-dd local
  waterMl: number;
  waterGoalMl: number;
  sleepHours: number;
  sleepGoalHours: number;
  moved: boolean;
  calories: number;
  pendingHabits: string[];
  habitsTotal: number;
  tasks: BriefTask[];
};

export const dayBrief = (input: BriefInput): string => {
  const open = input.tasks.filter((task) => !task.completed);
  const overdue = open.filter((task) => task.deadline && task.deadline.slice(0, 10) < input.todayKey);
  const dueToday = open.filter((task) => task.deadline?.slice(0, 10) === input.todayKey);
  const waterLeft = Math.max(0, input.waterGoalMl - input.waterMl);
  const habitLeft = input.pendingHabits.length;

  const nothingLogged =
    input.waterMl === 0 && input.sleepHours === 0 && !input.moved && input.calories === 0 && input.habitsTotal === 0 && open.length === 0;
  if (nothingLogged) return 'Empieza el día: apunta agua, sueño o una comida.';

  const clauses: string[] = [];
  if (waterLeft > 0 && input.waterGoalMl > 0) {
    const amount = formatWater(waterLeft);
    const verb = waterLeft < 1000 ? 'te faltan' : 'te falta';
    clauses.push(`${verb} ${amount} de agua`);
  }
  if (habitLeft > 0) clauses.push(habitLeft === 1 ? 'queda 1 hábito' : `quedan ${habitLeft} hábitos`);

  let sentence = '';
  if (clauses.length > 0) {
    const line = clauses.join(' y ');
    sentence = `${line.charAt(0).toUpperCase()}${line.slice(1)}.`;
  }
  const task = dueToday[0] ?? overdue[0];
  if (task) sentence = `${sentence}${sentence ? ' ' : ''}«${task.title}» ${dueToday[0] ? 'vence hoy' : 'está vencida'}.`.trim();
  if (sentence) return sentence;
  return 'Hoy está cubierto.';
};

// Resumen del día calculado en el dispositivo: sin red, sin coste y para todos.
// (La revisión con Claude va por el conector MCP, desde claude.ai.)

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

const liters = (ml: number) => `${(ml / 1000).toFixed(1).replace('.', ',')} L`;

const listNames = (names: string[]) => {
  if (names.length <= 2) return names.join(' y ');
  return `${names.slice(0, 2).join(', ')} y ${names.length - 2} más`;
};

export const dayBrief = (input: BriefInput): string => {
  const open = input.tasks.filter((task) => !task.completed);
  const overdue = open.filter((task) => task.deadline && task.deadline.slice(0, 10) < input.todayKey);
  const dueToday = open.filter((task) => task.deadline?.slice(0, 10) === input.todayKey);

  const nothingLogged =
    input.waterMl === 0 && input.sleepHours === 0 && !input.moved && input.calories === 0 && input.habitsTotal === 0;
  if (nothingLogged && open.length === 0) return 'Empieza el día: apunta agua, sueño o una comida.';

  const parts: string[] = [];
  if (overdue.length > 0) parts.push(overdue.length === 1 ? `«${overdue[0].title}» está vencida` : `${overdue.length} tareas vencidas`);
  if (dueToday.length > 0) parts.push(dueToday.length === 1 ? `«${dueToday[0].title}» vence hoy` : `${dueToday.length} tareas vencen hoy`);
  if (input.waterGoalMl > 0 && input.waterMl < input.waterGoalMl) parts.push(`te falta ${liters(input.waterGoalMl - input.waterMl)} de agua`);
  if (input.pendingHabits.length > 0) parts.push(`pendiente: ${listNames(input.pendingHabits)}`);
  if (input.sleepHours === 0) parts.push('sin sueño anotado');
  else if (input.sleepHours < input.sleepGoalHours) parts.push(`dormiste ${String(input.sleepHours).replace('.', ',')} h`);
  if (!input.moved) parts.push('sin movimiento');
  if (input.calories === 0) parts.push('sin comidas anotadas');

  if (parts.length === 0) return 'Todo lo de hoy está hecho.';
  const line = parts.slice(0, 3).join(' · ');
  return line.charAt(0).toUpperCase() + line.slice(1) + '.';
};

import { format, subDays } from 'date-fns';
import { HabitLog } from '../types/database';

export const habitStreak = (logs: HabitLog[], habitId: string, today = new Date()) => {
  const done = new Set(
    logs.filter((log) => log.habit_id === habitId && log.completed).map((log) => log.log_date.slice(0, 10)),
  );
  let cursor = done.has(format(today, 'yyyy-MM-dd')) ? today : subDays(today, 1);
  let count = 0;
  while (done.has(format(cursor, 'yyyy-MM-dd'))) {
    count += 1;
    cursor = subDays(cursor, 1);
  }
  return count;
};

import { formatRelative } from './format';

const dayKey = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

export const taskTiming = (deadline: string | null, todayKey: string, priority?: string | null) => {
  if (!deadline) return null;
  const day = deadline.slice(0, 10);
  if (day > todayKey) return null;
  if (day === todayKey) {
    return { text: priority === 'high' ? 'Hoy · Alta' : 'Hoy', overdue: false };
  }
  const yesterday = new Date(`${todayKey}T12:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  const when = day === dayKey(yesterday) ? 'ayer' : formatRelative(`${day}T12:00:00`);
  return { text: `Vencida · ${when}`, overdue: true };
};

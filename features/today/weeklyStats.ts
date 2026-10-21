import { Colors } from '../../constants/colors';
import { formatFlexible, formatNumber, formatWater } from '../../utils/format';
import { Metric, WeeklySummary } from '../../utils/weeklySummary';

export type Stat = {
  label: string;
  color: string;
  value: string;
  delta: string | null; // null: la semana anterior no tiene datos; '': igual
  tone: 'up' | 'down' | 'flat';
};

const toneOf = (delta: number | null, epsilon: number): Stat['tone'] => (delta == null || Math.abs(delta) < epsilon ? 'flat' : delta > 0 ? 'up' : 'down');

const signed = (text: string, delta: number) => (delta > 0 ? `+${text}` : delta < 0 ? `−${text.replace('-', '')}` : text);

const pick = (metric: Metric, label: string, color: string, show: (v: number) => string, showDelta: (d: number) => string, epsilon: number): Stat => ({
  label,
  color,
  value: metric.value == null ? '—' : show(metric.value),
  delta: metric.delta == null ? null : Math.abs(metric.delta) < epsilon ? '' : signed(showDelta(Math.abs(metric.delta)), metric.delta),
  tone: toneOf(metric.delta, epsilon),
});

export const weeklyStats = (summary: WeeklySummary): Stat[] => [
  pick(summary.sleepHours, 'Sueño medio', Colors.sleep, (v) => `${formatFlexible(v, 1)} h`, (d) => `${formatFlexible(d, 1)} h`, 0.1),
  pick(summary.workouts, 'Entrenos', Colors.workout, (v) => formatNumber(v), (d) => formatNumber(d), 1),
  pick(summary.habitRate, 'Hábitos', Colors.accent, (v) => `${formatNumber(v)} %`, (d) => `${formatNumber(d)} pts`, 1),
  pick(summary.waterMl, 'Agua al día', Colors.water, (v) => formatWater(v), (d) => formatWater(d), 50),
];

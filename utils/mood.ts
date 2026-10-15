export const MOODS = [
  { score: 1, label: 'Mal' },
  { score: 2, label: 'Regular' },
  { score: 3, label: 'Normal' },
  { score: 4, label: 'Bien' },
  { score: 5, label: 'Genial' },
] as const;

export const moodScale = (value: number | null | undefined): number | null => {
  if (value == null || Number.isNaN(value)) return null;
  const scaled = value > 5 ? Math.ceil(value / 2) : value;
  return Math.min(5, Math.max(1, Math.round(scaled)));
};

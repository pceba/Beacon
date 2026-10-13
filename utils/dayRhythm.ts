type RhythmInput = {
  waterDone: boolean;
  sleepDone: boolean;
  moved: boolean;
  nourished: boolean;
  habitsLeft: number;
  habitsTotal: number;
  tasksLeft: number;
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const dayRhythm = (input: RhythmInput) => {
  const needs: Array<[string, boolean]> = [
    ['water', input.waterDone],
    ['sleep', input.sleepDone],
    ['movement', input.moved],
    ['a meal', input.nourished],
  ];
  const needDone = needs.filter(([, done]) => done).length;
  const habitDone = Math.max(0, input.habitsTotal - input.habitsLeft);
  const done = needDone + habitDone;
  const total = needs.length + input.habitsTotal;

  const open = needs.filter(([, complete]) => !complete).map(([name]) => name);
  if (input.habitsLeft > 0) open.push(input.habitsLeft === 1 ? '1 habit' : `${input.habitsLeft} habits`);
  if (input.tasksLeft > 0) open.push(input.tasksLeft === 1 ? '1 task' : `${input.tasksLeft} tasks`);

  let line = 'Everything you planned for today is done.';
  if (needDone === 0 && input.habitsTotal === 0 && input.tasksLeft === 0) {
    line = 'Add a habit, or log water, sleep, movement, or a meal.';
  } else if (open.length === 1) {
    line = `${capitalize(open[0])} is still open.`;
  } else if (open.length > 1) {
    const head = open.slice(0, -1).join(', ');
    line = `${capitalize(head)} and ${open[open.length - 1]} still open.`;
  }

  return { done, total, progress: total === 0 ? 0 : done / total, line };
};

import { Colors } from '../../constants/colors';
import { formatFlexible, formatNumber } from '../../utils/format';
import { Day, emptyNote, Kpi, mean, Period, periodTail, signed, toneOf, valuesOf } from './insightsMath';

export type DayMaps = {
  sleep: Map<string, number>;
  water: Map<string, number>;
  calories: Map<string, number>;
  mood: Map<string, number>;
};

const deltaText = (comparable: boolean, delta: number, label: string) => {
  if (!comparable) return null;
  if (Math.abs(delta) < 0.05) return 'igual';
  return label;
};

// Las 4 cifras de arriba: media del periodo sobre días con registro y cambio frente al anterior.
export const buildKpis = (period: Period, current: Day[], previous: Day[], maps: DayMaps): Kpi[] => {
  const note = emptyNote(period);
  const tail = periodTail(period);

  const sleepNow = valuesOf(current, maps.sleep);
  const sleepPrev = valuesOf(previous, maps.sleep);
  const sleepAvg = mean(sleepNow);
  const sleepDelta = sleepAvg - mean(sleepPrev);
  const waterNow = valuesOf(current, maps.water);
  const waterPrev = valuesOf(previous, maps.water);
  const waterAvg = mean(waterNow);
  const waterDelta = waterAvg - mean(waterPrev);
  const calorieNow = valuesOf(current, maps.calories);
  const caloriePrev = valuesOf(previous, maps.calories);
  const calorieAvg = mean(calorieNow);
  const calorieDelta = calorieAvg - mean(caloriePrev);
  const moodNow = valuesOf(current, maps.mood);
  const moodPrev = valuesOf(previous, maps.mood);
  const moodAvg = mean(moodNow);
  const moodDelta = moodAvg - mean(moodPrev);
  const waterParts =
    waterAvg < 1000 ? { value: formatNumber(Math.round(waterAvg)), unit: 'ml/día' } : { value: formatFlexible(waterAvg / 1000, 2), unit: 'L/día' };

  return [
    {
      label: 'Sueño',
      color: Colors.sleep,
      value: formatFlexible(sleepAvg, 1),
      unit: 'h',
      spark: current.map((day) => maps.sleep.get(day.key) ?? null),
      delta: deltaText(sleepPrev.length > 0 && sleepNow.length > 0, sleepDelta, `${signed(sleepDelta, 1)} h ${tail}`),
      tone: toneOf(sleepDelta),
      empty: sleepNow.length === 0,
      emptyNote: note,
    },
    {
      label: 'Agua',
      color: Colors.water,
      value: waterParts.value,
      unit: waterParts.unit,
      spark: current.map((day) => (maps.water.has(day.key) ? (maps.water.get(day.key) as number) / 1000 : null)),
      delta: deltaText(
        waterPrev.length > 0 && waterNow.length > 0,
        waterDelta,
        waterParts.unit.startsWith('L')
          ? `${waterDelta > 0 ? '+' : '−'}${formatFlexible(Math.abs(waterDelta) / 1000, 2)} L`
          : `${waterDelta > 0 ? '+' : '−'}${formatNumber(Math.round(Math.abs(waterDelta)))} ml`,
      ),
      tone: toneOf(waterDelta),
      empty: waterNow.length === 0,
      emptyNote: note,
    },
    {
      label: 'Calorías',
      color: Colors.food,
      value: formatNumber(Math.round(calorieAvg)),
      unit: 'kcal/día',
      spark: current.map((day) => maps.calories.get(day.key) ?? null),
      delta: deltaText(
        caloriePrev.length > 0 && calorieNow.length > 0,
        calorieDelta,
        Math.abs(calorieDelta) < 0.5 ? 'igual' : `${calorieDelta > 0 ? '+' : '−'}${formatNumber(Math.abs(Math.round(calorieDelta)))} kcal`,
      ),
      tone: Math.abs(calorieDelta) < 0.5 ? 'flat' : toneOf(calorieDelta),
      empty: calorieNow.length === 0,
      emptyNote: note,
    },
    {
      label: 'Ánimo',
      color: Colors.mood,
      value: formatFlexible(moodAvg, 1),
      unit: 'de 5',
      spark: current.map((day) => maps.mood.get(day.key) ?? null),
      delta: deltaText(moodPrev.length > 0 && moodNow.length > 0, moodDelta, signed(moodDelta, 1)),
      tone: toneOf(moodDelta),
      empty: moodNow.length === 0,
      emptyNote: note,
    },
  ];
};

import React, { memo, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { AnimatedNumber } from '../../../components/ui/AnimatedNumber';
import { Colors } from '../../../constants/colors';
import { formatFlexible, formatNumber, formatWater } from '../../../utils/format';
import { Entrance } from '../hooks/useEntrance';
import { CellLabel, cellStyles as styles, Track } from './cellParts';

type Props = {
  waterMl: number;
  waterGoal: number;
  sleep: number;
  sleepGoal: number;
  moved: boolean;
  calories: number;
  caloriesGoal: number;
  enter: Entrance['enter'];
  onWater: (delta: number) => void;
  onSleep: () => void;
  onMove: () => void;
  onMeal: () => void;
};

const percent = (value: number, goal: number) => Math.min(100, Math.round((value / Math.max(goal, 1)) * 100));

// Libro del día: una tarjeta 2×2 con agua, sueño, movimiento y comida.
export const DayBoard = memo(({ waterMl, waterGoal, sleep, sleepGoal, moved, calories, caloriesGoal, enter, onWater, onSleep, onMove, onMeal }: Props) => (
  <Animated.View entering={enter(3)} style={styles.board}>
    <WaterCell value={waterMl} goal={waterGoal} onAdd={onWater} />
    <SleepCell hours={sleep} goal={sleepGoal} onPress={onSleep} />
    <MoveCell done={moved} onPress={onMove} />
    <MealCell calories={calories} goal={caloriesGoal} onPress={onMeal} />
  </Animated.View>
));

const WaterCell = memo(({ value, goal, onAdd }: { value: number; goal: number; onAdd: (delta: number) => void }) => {
  const add = useCallback(() => onAdd(250), [onAdd]);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Agua" onPress={add} onLongPress={add} style={styles.cell}>
      <CellLabel name="Agua" color={Colors.water}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>+250</Text>
        </View>
      </CellLabel>
      <View style={styles.valueRow}>
        <AnimatedNumber value={value} kind="water" style={styles.figure} />
        <Text numberOfLines={1} style={styles.unit}>
          {' / '}
          {formatWater(goal)}
        </Text>
      </View>
      <Track percent={percent(value, goal)} color={Colors.water} />
    </Pressable>
  );
});

const SleepCell = memo(({ hours, goal, onPress }: { hours: number; goal: number; onPress: () => void }) => (
  <Pressable accessibilityRole="button" accessibilityLabel="Sueño" onPress={onPress} style={[styles.cell, styles.cellEdge]}>
    <CellLabel name="Sueño" color={Colors.sleep} />
    {hours > 0 ? (
      <View style={styles.valueLine}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.3} style={styles.figure}>
          {formatFlexible(hours, 1)}
        </Text>
        <Text numberOfLines={1} style={styles.unit}>
          {' h'}
        </Text>
      </View>
    ) : (
      <View style={styles.copy}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.stateTitle}>
          Sin registrar
        </Text>
        <Text style={styles.caption}>Toca para añadir</Text>
      </View>
    )}
    <Track percent={percent(hours, goal)} color={hours >= goal ? Colors.sleep : Colors.sleepLow} />
  </Pressable>
));

const MoveCell = memo(({ done, onPress }: { done: boolean; onPress: () => void }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={done ? 'Movimiento hecho' : 'Marcar movimiento'}
    onPress={onPress}
    style={[styles.cell, styles.cellBottom]}
  >
    <CellLabel name="Movimiento" color={Colors.workout} />
    <View style={styles.copy}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.stateTitle}>
        {done ? 'Hecho' : 'Sin marcar'}
      </Text>
      <Text style={styles.caption}>{done ? 'Registrado hoy' : 'Toca si te has movido'}</Text>
    </View>
    <Track percent={done ? 100 : 0} color={Colors.workout} />
  </Pressable>
));

const MealCell = memo(({ calories, goal, onPress }: { calories: number; goal: number; onPress: () => void }) => (
  <Pressable accessibilityRole="button" accessibilityLabel="Comida" onPress={onPress} style={[styles.cell, styles.cellEdge, styles.cellBottom]}>
    <CellLabel name="Comida" color={Colors.food} />
    <View style={styles.valueLine}>
      <AnimatedNumber value={calories} kind="kcal" style={styles.figure} />
      <Text numberOfLines={1} style={styles.unit}>
        {' / '}
        {formatNumber(goal)} kcal
      </Text>
    </View>
    <Track percent={percent(calories, goal)} color={Colors.food} />
  </Pressable>
));

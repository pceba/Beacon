import React, { memo, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { Colors } from '../../../constants/colors';
import { Motion } from '../../../constants/motion';
import { cardShadow, Radius, Spacing } from '../../../constants/spacing';
import { Type, tabular } from '../../../constants/typography';
import { useReduceMotion } from '../../../hooks/useReduceMotion';
import { light } from '../../../lib/haptics';
import { formatRest } from '../numbers';
import { Rest } from '../hooks/useRestTimer';

type Props = {
  rest: Rest;
  bottom: number;
  onAdjust: (delta: number) => void;
  onSkip: () => void;
};

const DONE_MS = 2000;

// Barra de descanso (no modal). Solo ella se repinta cada segundo.
export const RestBar = memo(({ rest, bottom, onAdjust, onSkip }: Props) => {
  const reduce = useReduceMotion();
  const [now, setNow] = useState(() => Date.now());
  const finished = useRef(false);
  const remaining = Math.max(0, (rest.endsAt - now) / 1000);
  const done = remaining <= 0;

  useEffect(() => {
    finished.current = false;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [rest.endsAt]);

  useEffect(() => {
    if (!done || finished.current) return undefined;
    finished.current = true;
    light();
    const timer = setTimeout(onSkip, DONE_MS);
    return () => clearTimeout(timer);
  }, [done, onSkip]);

  const progress = rest.total > 0 ? Math.min(1, remaining / rest.total) : 0;
  const entering = reduce ? FadeIn.duration(Motion.reduced).reduceMotion(ReduceMotion.Never) : FadeInDown.duration(Motion.enter);

  return (
    <Animated.View entering={entering} exiting={FadeOut.duration(Motion.exit)} style={[styles.bar, { bottom }]}>
      <View style={styles.row}>
        {done ? (
          <Text accessibilityLiveRegion="polite" style={styles.label}>
            Descanso terminado
          </Text>
        ) : (
          <>
            <Text style={styles.label}>Descanso</Text>
            <Text accessibilityLabel={`Quedan ${formatRest(remaining)}`} maxFontSizeMultiplier={1.3} style={styles.clock}>
              {formatRest(remaining)}
            </Text>
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Quitar 15 segundos" onPress={() => onAdjust(-15)} style={styles.button}>
                <Text style={styles.buttonText}>−15</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Añadir 15 segundos" onPress={() => onAdjust(15)} style={styles.button}>
                <Text style={styles.buttonText}>+15</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Saltar descanso" onPress={onSkip} style={styles.button}>
                <Text style={styles.skip}>Saltar</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    justifyContent: 'center',
    ...cardShadow,
  },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: Spacing.s16, gap: Spacing.sm },
  label: { ...Type.caption, color: Colors.text2 },
  clock: { ...Type.bodyStrong, ...tabular, color: Colors.ink, flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  button: { minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  buttonText: { ...Type.bodyStrong, ...tabular, color: Colors.text2 },
  skip: { ...Type.bodyStrong, color: Colors.accent },
  track: { height: 3, backgroundColor: Colors.workoutSoft },
  fill: { height: 3, backgroundColor: Colors.workout },
});

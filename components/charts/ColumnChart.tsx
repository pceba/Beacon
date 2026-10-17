import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';
import { Colors } from '../../constants/colors';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { selection } from '../../lib/haptics';
import { formatFlexible } from '../../utils/format';
import { useChartWidth } from './useChartWidth';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type ChartBar = {
  value: number;
  label: string;
  bold?: boolean;
  tooltip: string;
  accessibilityLabel: string;
};

type Props = {
  bars: ChartBar[];
  color: string;
  goal?: number;
  goalLabel?: string;
  animateKey: string;
  belowColor?: string;
  selectedColor?: string;
};

const HEIGHT = 180;
const GUTTER = 34;
const TOP = 12;
const BASE = 142;

const niceMax = (value: number) => {
  const raw = Math.max(value, 1);
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * pow;
};

const tickLabel = (value: number) => (Number.isInteger(value) ? String(value) : formatFlexible(value, 1));

const BarShape = ({
  x0,
  x1,
  top,
  fill,
  delay,
  animateKey,
  reduce,
}: {
  x0: number;
  x1: number;
  top: number;
  fill: string;
  delay: number;
  animateKey: string;
  reduce: boolean;
}) => {
  const progress = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    if (reduce) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(delay, withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }));
  }, [animateKey, delay, progress, reduce]);

  const animatedProps = useAnimatedProps(() => {
    const y = BASE - (BASE - top) * progress.value;
    const rise = Math.max(0, BASE - y);
    const width = Math.max(0, x1 - x0);
    const radius = Math.min(4, rise / 2, width / 2);
    if (rise < 0.5 || width < 0.5) return { d: `M${x0} ${BASE} L${x1} ${BASE} Z` };
    return {
      d: `M${x0} ${BASE} L${x0} ${y + radius} Q${x0} ${y} ${x0 + radius} ${y} L${x1 - radius} ${y} Q${x1} ${y} ${x1} ${y + radius} L${x1} ${BASE} Z`,
    };
  });

  return <AnimatedPath animatedProps={animatedProps} fill={fill} />;
};

export const ColumnChart = ({ bars, color, goal, goalLabel, animateKey, belowColor = '#C9CBF0', selectedColor = '#2F33A8' }: Props) => {
  const { width, onLayout } = useChartWidth();
  const reduce = useReduceMotion();
  const [selected, setSelected] = useState<number | null>(null);
  const fade = useSharedValue(1);

  useEffect(() => {
    setSelected(null);
    if (!reduce) {
      fade.value = 1;
      return;
    }
    fade.value = 0;
    fade.value = withTiming(1, { duration: 120 });
  }, [animateKey, fade, reduce]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const peak = Math.max(goal ?? 0, ...bars.map((bar) => bar.value), 1);
  const max = niceMax(peak);
  const plot = Math.max(width - GUTTER, 1);
  const yOf = (value: number) => BASE - (value / max) * (BASE - TOP);
  const ticks = [0, max / 2, max];
  const goalY = goal != null ? yOf(goal) : null;

  const choose = (index: number) => {
    if (bars[index]?.value <= 0) return;
    selection();
    setSelected((current) => (current === index ? null : index));
  };

  return (
    <View onLayout={onLayout} style={styles.wrap}>
      {width > 0 ? (
        <Animated.View style={fadeStyle}>
          <Svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`}>
            {ticks.map((tick) => {
              const y = yOf(tick);
              if (goalY != null && Math.abs(y - goalY) < 12 && tick !== 0) return null;
              return (
                <React.Fragment key={tick}>
                  <Line x1={0} x2={plot} y1={y} y2={y} stroke={Colors.line} strokeWidth={1} />
                  <SvgText x={width - 2} y={y + 4} textAnchor="end" fontSize={11} fill={Colors.text4} fontFamily="Outfit_400Regular">
                    {tickLabel(tick)}
                  </SvgText>
                </React.Fragment>
              );
            })}
            {goalY != null && goalLabel ? (
              <>
                <Line x1={0} x2={plot} y1={goalY} y2={goalY} stroke={color} strokeOpacity={0.45} strokeWidth={1} />
                <SvgText x={width - 2} y={goalY + 4} textAnchor="end" fontSize={11} fontWeight="600" fill={Colors.text2} fontFamily="Outfit_600SemiBold">
                  {goalLabel}
                </SvgText>
              </>
            ) : null}
            {bars.map((bar, index) => {
              if (bar.value <= 0) return null;
              const slot = plot / Math.max(bars.length, 1);
              const barWidth = Math.min(22, slot * 0.6);
              const cx = slot * index + slot / 2;
              const fill = selected === index ? selectedColor : goal != null && bar.value < goal ? belowColor : color;
              return (
                <BarShape
                  key={`${animateKey}-${index}`}
                  x0={cx - barWidth / 2}
                  x1={cx + barWidth / 2}
                  top={yOf(bar.value)}
                  fill={fill}
                  delay={index * 20}
                  animateKey={animateKey}
                  reduce={reduce}
                />
              );
            })}
            {bars.map((bar, index) => {
              if (!bar.label) return null;
              const slot = plot / Math.max(bars.length, 1);
              const cx = slot * index + slot / 2;
              return (
                <SvgText
                  key={`label-${index}`}
                  x={cx}
                  y={172}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight="600"
                  fill={bar.bold ? Colors.ink : Colors.text3}
                  fontFamily="Outfit_600SemiBold"
                >
                  {bar.label}
                </SvgText>
              );
            })}
          </Svg>
          <Pressable accessibilityLabel="Cerrar detalle" style={styles.dismiss} onPress={() => setSelected(null)} />
          {bars.map((bar, index) => {
            const slot = plot / Math.max(bars.length, 1);
            return (
              <Pressable
                key={`hit-${index}`}
                accessibilityRole="button"
                accessibilityLabel={bar.accessibilityLabel}
                accessibilityState={{ selected: selected === index }}
                onPress={() => choose(index)}
                style={[styles.hit, { left: slot * index, width: slot, height: BASE }]}
              />
            );
          })}
          {selected != null && bars[selected] ? (
            <View pointerEvents="none" style={[styles.tip, { left: Math.max(4, Math.min((plot / Math.max(bars.length, 1)) * selected + plot / Math.max(bars.length, 1) / 2 - 64, width - 136)), top: Math.max(0, yOf(bars[selected].value) - 32) }]}>
              <Text numberOfLines={1} style={styles.tipText}>
                {bars[selected].tooltip}
              </Text>
            </View>
          ) : null}
        </Animated.View>
      ) : (
        <View style={{ height: HEIGHT }} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { minHeight: HEIGHT },
  dismiss: { ...StyleSheet.absoluteFillObject },
  hit: { position: 'absolute', top: 0 },
  tip: {
    position: 'absolute',
    minWidth: 68,
    maxWidth: 160,
    height: 24,
    borderRadius: 8,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  tipText: { color: Colors.surface, fontFamily: 'Outfit_600SemiBold', fontSize: 12 },
});

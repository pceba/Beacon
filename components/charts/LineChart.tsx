import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { Colors } from '../../constants/colors';
import { selection } from '../../lib/haptics';
import { useChartWidth } from './useChartWidth';

export type ChartPoint = {
  value: number;
  tooltip: string;
  accessibilityLabel: string;
};

type Props = {
  points: ChartPoint[];
  startLabel: string;
  endLabel: string;
  markIndex?: number | null;
  markLabel?: string;
};

const HEIGHT = 148;
const GUTTER = 34;
const TOP = 16;
const BASE = 108;
const PAD = 10;

const bounds = (values: number[]) => {
  const lo = Math.floor(Math.min(...values));
  const hi = Math.ceil(Math.max(...values));
  if (hi === lo) return { min: lo - 1, max: lo + 1 };
  return { min: lo, max: hi };
};

export const LineChart = ({ points, startLabel, endLabel, markIndex = null, markLabel }: Props) => {
  const { width, onLayout } = useChartWidth();
  const [selected, setSelected] = useState<number | null>(null);
  const values = points.map((point) => point.value);
  const { min, max } = values.length ? bounds(values) : { min: 0, max: 1 };
  const plotRight = Math.max(width - GUTTER, PAD + 8);
  const yOf = (value: number) => TOP + ((max - value) / Math.max(max - min, 1)) * (BASE - TOP);
  const xOf = (index: number) => {
    const inner = Math.max(plotRight - PAD - 16, 1);
    if (points.length <= 1) return PAD + 8;
    return PAD + 8 + (index / (points.length - 1)) * inner;
  };
  const plotted = points.map((point, index) => ({ ...point, x: xOf(index), y: yOf(point.value) }));
  const line = plotted.length ? `M${plotted.map((point) => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' L')}` : '';
  const area = line ? `${line} L${plotted[plotted.length - 1].x.toFixed(1)} ${BASE} L${plotted[0].x.toFixed(1)} ${BASE} Z` : '';
  const ticks = max - min <= 4 ? Array.from({ length: max - min + 1 }, (_, index) => min + index) : [min, Math.round((min + max) / 2), max];

  const choose = (index: number) => {
    selection();
    setSelected((current) => (current === index ? null : index));
  };

  return (
    <View onLayout={onLayout} style={styles.wrap}>
      {width > 0 && plotted.length > 0 ? (
        <>
          <Svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`}>
            {ticks.map((tick) => (
              <React.Fragment key={tick}>
                <Line x1={0} x2={plotRight} y1={yOf(tick)} y2={yOf(tick)} stroke={Colors.line} strokeWidth={1} />
                <SvgText x={width - 2} y={yOf(tick) + 4} textAnchor="end" fontSize={11} fill={Colors.text4} fontFamily="Outfit_400Regular">
                  {String(tick)}
                </SvgText>
              </React.Fragment>
            ))}
            <Path d={area} fill={Colors.text2} fillOpacity={0.08} />
            <Path d={line} fill="none" stroke={Colors.text2} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {plotted.map((point, index) => {
              if (index === markIndex) return null;
              const last = index === plotted.length - 1;
              return <Circle key={index} cx={point.x} cy={point.y} r={last ? 5 : 3} fill={last ? Colors.ink : Colors.text2} stroke="#FFFFFF" strokeWidth={2} />;
            })}
            {markIndex != null && plotted[markIndex] ? (
              <>
                <Circle cx={plotted[markIndex].x} cy={plotted[markIndex].y} r={6} fill={Colors.workout} stroke="#FFFFFF" strokeWidth={2} />
                {markLabel ? (
                  <SvgText
                    x={plotted[markIndex].x}
                    y={plotted[markIndex].y < 28 ? plotted[markIndex].y + 18 : plotted[markIndex].y - 12}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight="600"
                    fill={Colors.text2}
                    fontFamily="Outfit_600SemiBold"
                  >
                    {markLabel}
                  </SvgText>
                ) : null}
              </>
            ) : null}
            <SvgText x={plotted[0].x} y={136} fontSize={11} fill={Colors.text4} fontFamily="Outfit_400Regular">
              {startLabel}
            </SvgText>
            <SvgText x={plotted[plotted.length - 1].x} y={136} textAnchor="end" fontSize={11} fill={Colors.text4} fontFamily="Outfit_400Regular">
              {endLabel}
            </SvgText>
          </Svg>
          <Pressable accessibilityLabel="Cerrar detalle" style={styles.dismiss} onPress={() => setSelected(null)} />
          {plotted.map((point, index) => (
            <Pressable
              key={`hit-${index}`}
              accessibilityRole="button"
              accessibilityLabel={point.accessibilityLabel}
              accessibilityState={{ selected: selected === index }}
              onPress={() => choose(index)}
              style={[styles.hit, { left: point.x - 16, top: point.y - 16 }]}
            />
          ))}
          {selected != null && plotted[selected] ? (
            <View pointerEvents="none" style={[styles.tip, { left: Math.max(4, Math.min(plotted[selected].x - 58, width - 128)), top: Math.max(0, plotted[selected].y - 34) }]}>
              <Text numberOfLines={1} style={styles.tipText}>
                {plotted[selected].tooltip}
              </Text>
            </View>
          ) : null}
        </>
      ) : (
        <View style={{ height: HEIGHT }} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { minHeight: HEIGHT },
  dismiss: { ...StyleSheet.absoluteFillObject },
  hit: { position: 'absolute', width: 32, height: 32 },
  tip: {
    position: 'absolute',
    height: 24,
    borderRadius: 8,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  tipText: { color: Colors.surface, fontFamily: 'Outfit_600SemiBold', fontSize: 12 },
});

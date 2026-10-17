import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useChartWidth } from './useChartWidth';

type Props = {
  values: Array<number | null>;
  color: string;
  style?: StyleProp<ViewStyle>;
};

const HEIGHT = 28;

export const Sparkline = ({ values, color, style }: Props) => {
  const { width, onLayout } = useChartWidth();
  const points = values
    .map((value, index) => (value == null || !Number.isFinite(value) ? null : { index, value }))
    .filter((point): point is { index: number; value: number } => point != null);
  const lastIndex = values.length - 1;

  let path = '';
  let last: { x: number; y: number } | null = null;
  if (width > 0 && points.length > 1) {
    const min = Math.min(...points.map((point) => point.value));
    const max = Math.max(...points.map((point) => point.value));
    const span = max - min || 1;
    const pad = 6;
    const usable = Math.max(width - pad * 2, 1);
    const steps = Math.max(lastIndex, 1);
    const plotted = points.map((point) => ({
      x: pad + (point.index / steps) * usable,
      y: HEIGHT - pad - ((point.value - min) / span) * (HEIGHT - pad * 2),
    }));
    path = `M${plotted.map((point) => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' L')}`;
    last = plotted[plotted.length - 1];
  }

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onLayout={onLayout} style={[{ height: HEIGHT }, style]}>
      {width > 0 && path && last ? (
        <Svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`}>
          <Path d={path} fill="none" stroke="#C4CAD3" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={last.x} cy={last.y} r={3.5} fill={color} stroke="#FFFFFF" strokeWidth={2} />
        </Svg>
      ) : null}
    </View>
  );
};

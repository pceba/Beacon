import React from 'react';
import Svg, { Path } from 'react-native-svg';

// Marca de Beacon: anillo de 7 tramos, 4 encendidos (la barra del día, cerrada).
// Misma geometría que assets/icon.png.

type Props = {
  size?: number;
  color?: string;
  dimOpacity?: number;
};

const SEGMENTS = 7;
const LIT = 4;
const GAP = 0.46;

const arcs = (() => {
  const c = 50;
  const r = 26;
  return Array.from({ length: SEGMENTS }, (_, index) => {
    const a0 = -Math.PI / 2 + (index * 2 * Math.PI) / SEGMENTS + GAP / 2;
    const a1 = -Math.PI / 2 + ((index + 1) * 2 * Math.PI) / SEGMENTS - GAP / 2;
    const x0 = (c + r * Math.cos(a0)).toFixed(2);
    const y0 = (c + r * Math.sin(a0)).toFixed(2);
    const x1 = (c + r * Math.cos(a1)).toFixed(2);
    const y1 = (c + r * Math.sin(a1)).toFixed(2);
    return `M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`;
  });
})();

export const BeaconMark = ({ size = 24, color = '#FFFFFF', dimOpacity = 0.32 }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {arcs.map((d, index) => (
      <Path
        key={d}
        d={d}
        fill="none"
        stroke={color}
        strokeOpacity={index < LIT ? 1 : dimOpacity}
        strokeWidth={9}
        strokeLinecap="round"
      />
    ))}
  </Svg>
);

import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

const MOUTHS = [
  'M8 16.5c1-1.5 2.4-2 4-2s3 .5 4 2',
  'M8.5 15.5c1-.6 2.2-.9 3.5-.9s2.5.3 3.5.9',
  'M8.5 15h7',
  'M8.5 14.5c1 .8 2.2 1.2 3.5 1.2s2.5-.4 3.5-1.2',
  'M8 14c1 1.6 2.4 2.4 4 2.4s3-.8 4-2.4',
];

type Props = { index: number; color: string; size?: number };

export const MoodFace = ({ index, color, size = 26 }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx={12} cy={12} r={9.5} stroke={color} strokeWidth={1.8} fill="none" />
    <Circle cx={9} cy={10} r={0.8} fill={color} />
    <Circle cx={15} cy={10} r={0.8} fill={color} />
    <Path d={MOUTHS[index] ?? MOUTHS[2]} stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" />
  </Svg>
);

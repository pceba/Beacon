import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { selection } from '../../lib/haptics';

type Props = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  label: string;
};

export const Switch = ({ value, onValueChange, label }: Props) => (
  <Pressable
    accessibilityRole="switch"
    accessibilityLabel={label}
    accessibilityState={{ checked: value }}
    hitSlop={8}
    onPress={() => {
      selection();
      onValueChange(!value);
    }}
    style={[styles.track, value ? styles.on : null]}
  >
    <View style={[styles.thumb, value ? styles.thumbOn : null]} />
  </Pressable>
);

const styles = StyleSheet.create({
  track: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#D5DAE1',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  on: { backgroundColor: Colors.food },
  thumb: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.surface },
  thumbOn: { alignSelf: 'flex-end' },
});

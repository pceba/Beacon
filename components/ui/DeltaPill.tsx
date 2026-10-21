import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { Type, tabular } from '../../constants/typography';

type Props = { delta: number; label: string };

export const DeltaPill = ({ delta, label }: Props) => {
  const tone = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const sign = delta > 0 ? '+' : '';
  return (
    <View style={[styles.pill, styles[tone]]}>
      <Text style={[styles.text, styles[`${tone}Text`]]}>
        {sign}
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  up: { backgroundColor: Colors.successSoft },
  down: { backgroundColor: Colors.dangerSoft },
  flat: { backgroundColor: Colors.line },
  text: { ...Type.caption, ...tabular },
  upText: { color: Colors.success },
  downText: { color: Colors.danger },
  flatText: { color: Colors.text2 },
});

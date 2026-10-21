import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../../constants/colors';
import { Spacing } from '../../../constants/spacing';
import { Type } from '../../../constants/typography';

type Props = { title: string; leftLabel: string; onLeft: () => void };

// Cabecera de formulario: texto a la izquierda (44 de alto) y título centrado.
export const ScreenBar = memo(({ title, leftLabel, onLeft }: Props) => (
  <View style={styles.bar}>
    <Pressable accessibilityRole="button" accessibilityLabel={leftLabel} onPress={onLeft} style={styles.side}>
      <Text style={styles.left}>{leftLabel}</Text>
    </Pressable>
    <Text numberOfLines={1} style={styles.title}>
      {title}
    </Text>
    <View style={styles.side} />
  </View>
));

const styles = StyleSheet.create({
  bar: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { minWidth: 88, minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.lg },
  left: { ...Type.body, color: Colors.text2 },
  title: { ...Type.bodyStrong, color: Colors.ink, flexShrink: 1 },
});

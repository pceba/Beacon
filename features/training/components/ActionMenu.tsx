import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../../constants/colors';
import { Spacing } from '../../../constants/spacing';
import { Type } from '../../../constants/typography';

export type MenuItem = { key: string; label: string; danger?: boolean; disabled?: boolean };

type Props = { title?: string; items: MenuItem[]; onSelect: (key: string) => void };

// Contenido de una hoja de opciones (⋯): filas de 56 con el verbo.
export const ActionMenu = memo(({ title, items, onSelect }: Props) => (
  <View>
    {title ? (
      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>
    ) : null}
    {items.map((item, index) => (
      <Pressable
        key={item.key}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{ disabled: !!item.disabled }}
        disabled={item.disabled}
        onPress={() => onSelect(item.key)}
        style={[styles.row, index === items.length - 1 ? styles.last : null]}
      >
        <Text style={[styles.label, item.danger ? styles.danger : null, item.disabled ? styles.disabled : null]}>{item.label}</Text>
      </Pressable>
    ))}
  </View>
));

const styles = StyleSheet.create({
  title: { ...Type.section, color: Colors.ink, marginBottom: Spacing.sm },
  row: { minHeight: 56, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.line },
  last: { borderBottomWidth: 0 },
  label: { ...Type.body, color: Colors.ink },
  danger: { color: Colors.danger },
  disabled: { color: Colors.text4 },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Type } from '../../constants/typography';
import { Button } from './Button';
import { Sheet } from './Sheet';

type Props = {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
};

export const ConfirmSheet = ({ visible, title, body, confirmLabel, onConfirm, onClose }: Props) => (
  <Sheet visible={visible} onClose={onClose}>
    <View style={styles.copy}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
    <Button title={confirmLabel} variant="dangerFill" onPress={onConfirm} />
    <Button title="Cancelar" variant="ghost" onPress={onClose} />
  </Sheet>
);

const styles = StyleSheet.create({
  copy: { gap: Spacing.sm, marginBottom: Spacing.lg },
  title: { ...Type.headline, color: Colors.ink },
  body: { ...Type.body, color: Colors.text2 },
});

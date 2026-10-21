import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { Colors } from '../../../constants/colors';
import { Radius, Spacing } from '../../../constants/spacing';
import { Type } from '../../../constants/typography';

type Props = {
  title: string;
  // Sin `name` solo se editan las notas (notas de un ejercicio).
  name?: string;
  notes: string;
  onSave: (name: string, notes: string) => void;
};

// Contenido de hoja para nombre y notas. Se monta al abrir, así parte de los valores actuales.
export const MetaSheet = ({ title, name, notes, onSave }: Props) => {
  const [nameText, setNameText] = useState(name ?? '');
  const [notesText, setNotesText] = useState(notes);
  const withName = name !== undefined;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {withName ? (
        <TextInput
          accessibilityLabel="Nombre"
          value={nameText}
          onChangeText={setNameText}
          placeholder="Entreno"
          placeholderTextColor={Colors.text4}
          maxLength={60}
          style={styles.input}
        />
      ) : null}
      <TextInput
        accessibilityLabel="Notas"
        value={notesText}
        onChangeText={setNotesText}
        placeholder="Notas"
        placeholderTextColor={Colors.text4}
        multiline
        maxLength={500}
        autoFocus={!withName}
        style={[styles.input, styles.notes]}
      />
      <Button title="Guardar" onPress={() => onSave(nameText, notesText)} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  title: { ...Type.headline, color: Colors.ink },
  input: {
    ...Type.body,
    color: Colors.ink,
    backgroundColor: Colors.fill,
    borderRadius: Radius.md,
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  notes: { minHeight: 96, textAlignVertical: 'top' },
});

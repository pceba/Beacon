import React, { useState } from 'react';
import { toast } from '../../lib/toast';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Input } from '../../components/Input';
import { FormScreen } from '../../components/ui/FormScreen';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { createNote } from '../../services/noteService';
import { getCurrentUserId } from '../../services/authService';

export const AddNoteModal = () => {
  const navigation = useNavigation();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const onSave = async () => {
    try {
      const userId = await getCurrentUserId();
      await createNote(userId, { title: title || null, content });
      navigation.goBack();
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha guardado', kind: 'error' });
    }
  };

  return (
    <FormScreen title="Nota" saveLabel="Guardar nota" onSave={() => void onSave()}>
        <Input label="Título" value={title} onChangeText={setTitle} />
        <Input label="Texto" value={content} onChangeText={setContent} multiline numberOfLines={8} />
    </FormScreen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, gap: Spacing.md },
});

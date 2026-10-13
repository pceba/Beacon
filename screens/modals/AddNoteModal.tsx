import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
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
      Alert.alert('No se ha guardado');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Input label="Título" value={title} onChangeText={setTitle} />
        <Input label="Texto" value={content} onChangeText={setContent} multiline numberOfLines={8} />
        <Button title="Guardar" onPress={onSave} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md },
});

import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { StarRating } from '../../components/StarRating';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { createJournalEntry } from '../../services/journalService';
import { getCurrentUserId } from '../../services/authService';

export const AddReflectionModal = () => {
  const navigation = useNavigation();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState(3);
  const [tags, setTags] = useState('');

  const onSave = async () => {
    try {
      const userId = await getCurrentUserId();
      await createJournalEntry(userId, {
        title: title || null,
        content,
        mood_score: mood,
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      });
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('No se ha guardado');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Input label="Título" value={title} onChangeText={setTitle} placeholder="Opcional" />
        <Input label="Texto" value={content} onChangeText={setContent} multiline numberOfLines={8} />
        <StarRating value={mood} onChange={setMood} />
        <Input label="Etiquetas" value={tags} onChangeText={setTags} placeholder="separadas por comas" />
        <Button title="Guardar" onPress={onSave} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md },
});

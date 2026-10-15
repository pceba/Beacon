import React, { useState } from 'react';
import { toast } from '../../lib/toast';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TextField } from '../../components/ui/TextField';
import { FormScreen } from '../../components/ui/FormScreen';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { createJournalEntry } from '../../services/journalService';
import { getCurrentUserId } from '../../services/authService';
import { MOODS } from '../../utils/mood';

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
      toast.show({ message: 'No se ha guardado', kind: 'error' });
    }
  };

  return (
    <FormScreen title="Reflexión" saveLabel="Guardar reflexión" onSave={() => void onSave()}>
        <TextField label="Título" value={title} onChangeText={setTitle} placeholder="Opcional" />
        <TextField label="Texto" value={content} onChangeText={setContent} multiline numberOfLines={8} />
        <View style={styles.moodRow}>
          {MOODS.map(({ score, label }) => {
            const selected = mood === score;
            return (
              <Pressable
                key={score}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected }}
                onPress={() => setMood(score)}
                style={[styles.moodChip, selected ? styles.moodChipOn : null]}
              >
                <Text style={[styles.moodLabel, selected ? styles.moodLabelOn : null]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        <TextField label="Etiquetas" value={tags} onChangeText={setTags} placeholder="separadas por comas" />
    </FormScreen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, gap: Spacing.md },
  moodRow: { flexDirection: 'row', gap: 4 },
  moodChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.fill,
    paddingHorizontal: 2,
  },
  moodChipOn: { backgroundColor: Colors.accent },
  moodLabel: { fontFamily: Typography.fontMedium, fontSize: 12, color: Colors.text2, textAlign: 'center' },
  moodLabelOn: { color: Colors.surface },
});

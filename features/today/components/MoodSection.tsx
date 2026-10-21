import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Card } from '../../../components/ui/Card';
import { MoodFace } from '../../../components/ui/MoodFace';
import { Colors } from '../../../constants/colors';
import { MOODS } from '../../../utils/mood';
import { Entrance } from '../hooks/useEntrance';
import { sectionStyles } from './sectionStyles';

type Props = { mood: number | null; enter: Entrance['enter']; onChange: (score: number) => void };

export const MoodSection = memo(({ mood, enter, onChange }: Props) => (
  <>
    <Animated.View entering={enter(6)}>
      <Text style={sectionStyles.title}>¿Cómo estás hoy?</Text>
    </Animated.View>
    <Card>
      <View style={styles.moods}>
        {MOODS.map(({ score, label }, index) => (
          <MoodButton key={score} score={score} label={label} index={index} selected={mood === score} onChange={onChange} />
        ))}
      </View>
    </Card>
  </>
));

type ButtonProps = { score: number; label: string; index: number; selected: boolean; onChange: (score: number) => void };

const MoodButton = memo(({ score, label, index, selected, onChange }: ButtonProps) => {
  const press = useCallback(() => onChange(score), [onChange, score]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={press}
      style={[styles.mood, selected ? styles.moodOn : null]}
    >
      <MoodFace index={index} color={selected ? Colors.surface : Colors.text2} size={26} />
      <Text style={[styles.moodLabel, selected ? styles.moodLabelOn : null]}>{label}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  moods: { flexDirection: 'row', gap: 6 },
  mood: { flex: 1, minHeight: 72, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.fill },
  moodOn: { backgroundColor: Colors.ink },
  moodLabel: { fontFamily: 'Outfit_600SemiBold', fontSize: 11, color: Colors.text2, textAlign: 'center' },
  moodLabelOn: { color: Colors.surface },
});

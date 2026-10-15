import React, { useEffect, useState } from 'react';
import { toast } from '../../lib/toast';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Input } from '../../components/Input';
import { Segmented } from '../../components/Segmented';
import { Button } from '../../components/Button';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { createMealTemplate, createNutritionLog, getMealTemplates, getNutritionLogs, updateNutritionLog } from '../../services/nutritionService';
import { getCurrentUserId } from '../../services/authService';
import { LogStackParamList } from '../../types/navigation';
import { MealTemplate } from '../../types/database';
import { finishLog, useReturnToToday } from '../../utils/finishLog';

type Route = RouteProp<LogStackParamList, 'LogMealScreen'>;

export const LogMealScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  useReturnToToday(route.params?.fromToday);
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [notes, setNotes] = useState('');
  const [mealType, setMealType] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 11) return 'breakfast';
    if (hour < 16) return 'lunch';
    if (hour < 19) return 'snack';
    return 'dinner';
  });
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadEdit = async () => {
      if (!route.params?.logId) return;
      try {
        const userId = await getCurrentUserId();
        const rows = await getNutritionLogs(userId);
        const selected = rows.find((row) => row.id === route.params?.logId);
        if (!selected) return;
        setName(selected.name);
        setCalories(String(selected.calories));
        setProtein(String(selected.protein_g));
        setCarbs(String(selected.carbs_g));
        setFat(String(selected.fat_g));
        setNotes(selected.notes ?? '');
        setMealType(selected.meal_type);
      } catch (error) {
        console.error(error);
      }
    };
    loadEdit();
  }, [route.params?.logId]);

  const applyTemplate = (template: MealTemplate) => {
    setName(template.name);
    setCalories(String(template.calories));
    setProtein(String(template.protein_g));
    setCarbs(String(template.carbs_g));
    setFat(String(template.fat_g));
    setMealType(template.meal_type);
  };

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const userId = await getCurrentUserId();
        setTemplates(await getMealTemplates(userId));
      } catch (loadError) {
        console.error(loadError);
        toast.show({ message: 'No se han cargado las comidas guardadas', kind: 'error' });
      }
    };
    loadTemplates();
  }, []);

  const onSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Ponle un nombre.');
      return;
    }
    setError('');
    try {
      const userId = await getCurrentUserId();
      const payload = {
        name: trimmed,
        calories: Number(calories || 0),
        protein_g: Number(protein || 0),
        carbs_g: Number(carbs || 0),
        fat_g: Number(fat || 0),
        meal_type: mealType,
        notes: notes || null,
      };
      if (route.params?.logId) await updateNutritionLog(userId, route.params.logId, payload);
      else await createNutritionLog(userId, payload);
      if (saveTemplate) await createMealTemplate(userId, { ...payload });
      finishLog(navigation, route.params?.fromToday);
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha guardado', kind: 'error' });
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <Input label="Nombre" value={name} onChangeText={(value) => { setName(value); if (error) setError(''); }} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Input label="Calorías" value={calories} onChangeText={setCalories} keyboardType="numeric" />
        <Input label="Proteína (g)" value={protein} onChangeText={setProtein} keyboardType="numeric" />
        <Input label="Carbos (g)" value={carbs} onChangeText={setCarbs} keyboardType="numeric" />
        <Input label="Grasa (g)" value={fat} onChangeText={setFat} keyboardType="numeric" />
        <Segmented
          value={mealType}
          onChange={setMealType}
          options={[
            { value: 'breakfast', label: 'Desayuno' },
            { value: 'lunch', label: 'Comida' },
            { value: 'dinner', label: 'Cena' },
            { value: 'snack', label: 'Snack' },
          ]}
        />
        <Input label="Notas" value={notes} onChangeText={setNotes} multiline numberOfLines={6} />
        <Pressable accessibilityRole="button" onPress={() => setSaveTemplate((prev) => !prev)} style={styles.toggleHit}>
          <Text style={styles.toggle}>{saveTemplate ? 'Guardada como plantilla' : 'Guardar como plantilla'}</Text>
        </Pressable>
        {templates.length > 0 ? (
          <View style={styles.saved}>
            <Text style={styles.savedLabel}>Comidas guardadas</Text>
            {templates.map((template) => (
              <Pressable
                key={template.id}
                accessibilityRole="button"
                accessibilityLabel={template.name}
                onPress={() => applyTemplate(template)}
                style={styles.savedRow}
              >
                <Text style={styles.savedName}>{template.name}</Text>
                <Text style={styles.savedMeta}>{template.calories} kcal</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Button title={route.params?.logId ? 'Actualizar' : 'Guardar'} onPress={onSubmit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  toggleHit: { minHeight: 44, justifyContent: 'center' },
  toggle: { color: Colors.text2, fontFamily: Typography.fontRegular, fontSize: Typography.sm },
  saved: { gap: 8 },
  savedLabel: { color: Colors.text3, fontFamily: Typography.fontMedium, fontSize: Typography.sm },
  savedRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  savedName: { flex: 1, color: Colors.ink, fontFamily: Typography.fontMedium, fontSize: Typography.md },
  savedMeta: { color: Colors.text3, fontFamily: Typography.fontRegular, fontSize: Typography.sm },
  error: { color: Colors.danger, fontFamily: Typography.fontRegular, fontSize: Typography.sm },
});

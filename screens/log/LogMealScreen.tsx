import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
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

type Route = RouteProp<LogStackParamList, 'LogMealScreen'>;

export const LogMealScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [notes, setNotes] = useState('');
  const [mealType, setMealType] = useState('breakfast');
  const [saveTemplate, setSaveTemplate] = useState(false);

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

  const onPickTemplate = async () => {
    try {
      const userId = await getCurrentUserId();
      const templates = await getMealTemplates(userId);
      const top = templates[0];
      if (!top) return;
      setName(top.name);
      setCalories(String(top.calories));
      setProtein(String(top.protein_g));
      setCarbs(String(top.carbs_g));
      setFat(String(top.fat_g));
      setMealType(top.meal_type);
    } catch (error) {
      console.error(error);
      Alert.alert('No se han cargado las comidas guardadas');
    }
  };

  const onSubmit = async () => {
    try {
      const userId = await getCurrentUserId();
      const payload = {
        name,
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
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('No se ha guardado');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <Input label="Nombre" value={name} onChangeText={setName} />
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
        <Text onPress={() => setSaveTemplate((prev) => !prev)} style={styles.toggle}>
          {saveTemplate ? 'Guardada como plantilla' : 'Guardar como plantilla'}
        </Text>
        <Button title="Usar una comida guardada" variant="secondary" onPress={onPickTemplate} />
        <Button title={route.params?.logId ? 'Actualizar' : 'Guardar'} onPress={onSubmit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  toggle: { color: Colors.textSecondary, fontFamily: Typography.fontRegular, fontSize: Typography.sm },
});

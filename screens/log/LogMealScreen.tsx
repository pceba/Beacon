import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Chip } from '../../components/ui/Chip';
import { FormScreen } from '../../components/ui/FormScreen';
import { Segmented } from '../../components/ui/Segmented';
import { Switch } from '../../components/ui/Switch';
import { TimePill } from '../../components/ui/TimePill';
import { Colors } from '../../constants/colors';
import { Type, tabular } from '../../constants/typography';
import { success } from '../../lib/haptics';
import { toast } from '../../lib/toast';
import { getCurrentUserId } from '../../services/authService';
import { createMealTemplate, createNutritionLog, deleteNutritionLog, getMealTemplates, getNutritionLogs, updateNutritionLog } from '../../services/nutritionService';
import { MealTemplate } from '../../types/database';
import { LogStackParamList } from '../../types/navigation';
import { formatNumber } from '../../utils/format';
import { finishLog, useReturnToToday } from '../../utils/finishLog';

type Route = RouteProp<LogStackParamList, 'LogMealScreen'>;
type MealKind = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const nowTime = () => {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const defaultMeal = (): MealKind => {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 19) return 'snack';
  return 'dinner';
};

export const LogMealScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  useReturnToToday(route.params?.fromToday);
  const [name, setName] = useState('');
  const [focused, setFocused] = useState(false);
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [mealType, setMealType] = useState<MealKind>(defaultMeal);
  const [time, setTime] = useState(nowTime);
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [todayCalories, setTodayCalories] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const userId = await getCurrentUserId();
        const [rows, saved] = await Promise.all([getNutritionLogs(userId), getMealTemplates(userId)]);
        setTemplates(saved);
        const today = new Date().toISOString().slice(0, 10);
        setTodayCalories(rows.filter((row) => row.logged_at.slice(0, 10) === today).reduce((sum, row) => sum + row.calories, 0));
        if (!route.params?.logId) return;
        const selected = rows.find((row) => row.id === route.params?.logId);
        if (!selected) return;
        setName(selected.name);
        setCalories(String(selected.calories));
        setProtein(String(selected.protein_g));
        setCarbs(String(selected.carbs_g));
        setFat(String(selected.fat_g));
        if (selected.meal_type === 'breakfast' || selected.meal_type === 'lunch' || selected.meal_type === 'dinner' || selected.meal_type === 'snack') {
          setMealType(selected.meal_type);
        }
        setTime(new Date(selected.logged_at).toTimeString().slice(0, 5));
      } catch (loadError) {
        console.error(loadError);
      }
    };
    void load();
  }, [route.params?.logId]);

  const applyTemplate = (template: MealTemplate) => {
    setName(template.name);
    setCalories(String(template.calories));
    setProtein(String(template.protein_g));
    setCarbs(String(template.carbs_g));
    setFat(String(template.fat_g));
    if (template.meal_type === 'breakfast' || template.meal_type === 'lunch' || template.meal_type === 'dinner' || template.meal_type === 'snack') {
      setMealType(template.meal_type);
    }
  };

  const onSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Ponle un nombre.');
      return;
    }
    setSaving(true);
    try {
      const userId = await getCurrentUserId();
      const [hour, minute] = time.split(':').map((part) => Number(part));
      const logged = new Date();
      logged.setHours(hour || 0, minute || 0, 0, 0);
      const payload = {
        name: trimmed,
        calories: Number(calories || 0),
        protein_g: Number(protein || 0),
        carbs_g: Number(carbs || 0),
        fat_g: Number(fat || 0),
        meal_type: mealType,
        notes: null,
        logged_at: logged.toISOString(),
      };
      if (route.params?.logId) {
        await updateNutritionLog(userId, route.params.logId, payload);
        success();
        finishLog(navigation, route.params?.fromToday);
        return;
      }
      const created = await createNutritionLog(userId, payload);
      if (saveTemplate) {
        await createMealTemplate(userId, {
          name: payload.name,
          calories: payload.calories,
          protein_g: payload.protein_g,
          carbs_g: payload.carbs_g,
          fat_g: payload.fat_g,
          meal_type: payload.meal_type,
        });
      }
      success();
      finishLog(navigation, route.params?.fromToday);
      toast.show({
        message: 'Comida guardada',
        kind: 'success',
        action: {
          label: 'Deshacer',
          onPress: () => {
            void deleteNutritionLog(userId, created.id).catch((undoError) => {
              console.error(undoError);
              toast.show({ message: 'No se ha podido deshacer.', kind: 'error' });
            });
          },
        },
      });
    } catch (saveError) {
      console.error(saveError);
      toast.show({ message: 'Sin conexión. Lo guardamos en el móvil y lo subimos cuando vuelva la red.', kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const kcal = Number(calories || 0);

  return (
    <FormScreen title="Comida" saveLabel="Guardar comida" onSave={() => void onSubmit()} loading={saving}>
      <TextInput
        value={name}
        onChangeText={(value) => {
          setName(value);
          if (error) setError('');
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Nombre"
        placeholderTextColor={Colors.text4}
        style={[styles.name, focused ? styles.nameOn : null]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {templates.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.caption}>Recientes</Text>
          <View style={styles.chips}>
            {templates.slice(0, 8).map((template) => (
              <Chip key={template.id} label={`${template.name} · ${template.calories} kcal`} onPress={() => applyTemplate(template)} />
            ))}
          </View>
        </View>
      ) : null}
      <TextInput value={calories} onChangeText={setCalories} keyboardType="numeric" style={styles.display} maxFontSizeMultiplier={1.3} />
      <Text style={styles.kcal}>kcal</Text>
      <Text style={styles.caption}>Llevas {formatNumber(todayCalories, 0)} de 2.000 hoy</Text>
      <View style={styles.macros}>
        <View style={styles.macro}>
          <Text style={styles.caption}>Proteína</Text>
          <TextInput value={protein} onChangeText={setProtein} keyboardType="numeric" style={styles.macroInput} />
        </View>
        <View style={styles.macro}>
          <Text style={styles.caption}>Carbos</Text>
          <TextInput value={carbs} onChangeText={setCarbs} keyboardType="numeric" style={styles.macroInput} />
        </View>
        <View style={styles.macro}>
          <Text style={styles.caption}>Grasa</Text>
          <TextInput value={fat} onChangeText={setFat} keyboardType="numeric" style={styles.macroInput} />
        </View>
      </View>
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
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Hora</Text>
        <TimePill value={time} onChange={setTime} label="Hora" />
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Guardar en recientes</Text>
        <Switch value={saveTemplate} onValueChange={setSaveTemplate} label="Guardar en recientes" />
      </View>
    </FormScreen>
  );
};

const styles = StyleSheet.create({
  name: {
    ...Type.headline,
    fontSize: 24,
    lineHeight: 30,
    color: Colors.ink,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minHeight: 48,
  },
  nameOn: { borderBottomColor: Colors.accent },
  error: { ...Type.caption, color: Colors.danger },
  block: { gap: 8 },
  caption: { ...Type.caption, color: Colors.text3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  display: { ...Type.display, ...tabular, color: Colors.ink, minHeight: 64 },
  kcal: { ...Type.caption, color: Colors.text3, marginTop: -8 },
  macros: { flexDirection: 'row', gap: 8 },
  macro: { flex: 1, backgroundColor: Colors.fill, borderRadius: 14, padding: 12, gap: 4 },
  macroInput: { ...Type.section, ...tabular, color: Colors.ink, minHeight: 32 },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { ...Type.body, color: Colors.ink },
});

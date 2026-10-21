import React, { useState } from 'react';
import { toast } from '../../lib/toast';
import { invalidateTables } from '../../lib/query';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FormScreen } from '../../components/ui/FormScreen';
import { HABIT_COLORS, HABIT_ICON_OPTIONS } from '../../components/habitVisuals';
import { TextField } from '../../components/ui/TextField';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { getCurrentUserId } from '../../services/authService';
import { createHabit } from '../../services/habitService';

export const AddHabitModal = () => {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(HABIT_ICON_OPTIONS[0].id);
  const [color, setColor] = useState<string>(HABIT_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Ponle un nombre.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const userId = await getCurrentUserId();
      await createHabit(userId, { name: trimmed, icon, color, frequency: 'daily' });
      void invalidateTables('habits');
      navigation.goBack();
    } catch (saveError) {
      console.error(saveError);
      toast.show({ message: 'No se ha guardado', kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen title="Hábito" saveLabel="Guardar hábito" onSave={() => void onSave()} loading={saving}>
        <TextField label="Nombre" value={name} onChangeText={setName} placeholder="Leer, caminar, estirar…" error={error} />
        <Text style={styles.label}>Icono</Text>
        <View style={styles.iconRow}>
          {HABIT_ICON_OPTIONS.map((option) => {
            const selected = icon === option.id;
            const Icon = option.Icon;
            return (
              <Pressable
                key={option.id}
                accessibilityLabel={option.id}
                accessibilityState={{ selected }}
                onPress={() => setIcon(option.id)}
                style={({ pressed }) => [styles.iconButton, selected ? { borderColor: color, backgroundColor: `${color}18` } : null, pressed ? styles.pressed : null]}
              >
                <Icon color={selected ? color : Colors.text2} size={18} />
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.label}>Color</Text>
        <View style={styles.colorRow}>
          {HABIT_COLORS.map((swatch) => {
            const selected = color === swatch;
            return (
              <Pressable
                key={swatch}
                accessibilityLabel={`Color ${swatch}`}
                accessibilityState={{ selected }}
                onPress={() => setColor(swatch)}
                style={({ pressed }) => [styles.swatch, { backgroundColor: swatch }, selected ? styles.swatchOn : null, pressed ? styles.pressed : null]}
              />
            );
          })}
        </View>
    </FormScreen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  label: {
    fontFamily: Typography.fontMedium,
    fontSize: Typography.sm,
    color: Colors.text2,
  },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  colorRow: { flexDirection: 'row', gap: Spacing.sm },
  swatch: { width: 44, height: 44, borderRadius: 22 },
  swatchOn: { borderWidth: 3, borderColor: Colors.surface, outlineWidth: 2, outlineColor: Colors.ink, outlineOffset: 1 },
  pressed: { opacity: 0.75 },
});

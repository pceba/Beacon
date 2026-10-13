import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { getClaudeKey, getClaudeState, saveClaudeKey, syncWithClaude } from '../../services/claudeSync';
import { getPreferences, Preferences, savePreferences } from '../../services/preferencesService';

const asNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const SettingsScreen = () => {
  const navigation = useNavigation();
  const [displayName, setDisplayName] = useState('');
  const [water, setWater] = useState('2000');
  const [calories, setCalories] = useState('2000');
  const [sleep, setSleep] = useState('7');
  const [claudeKey, setClaudeKey] = useState('');
  const [claudeStatus, setClaudeStatus] = useState('Sin clave, no se sincroniza.');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const refreshClaude = async () => {
    const state = await getClaudeState();
    if (!state.configured) {
      setClaudeStatus('Sin clave, no se sincroniza.');
      return;
    }
    if (state.error) {
      setClaudeStatus(state.error);
      return;
    }
    const when = state.lastSyncAt ? new Date(state.lastSyncAt).toLocaleString('es') : 'aún no';
    setClaudeStatus(state.brief ? `${state.brief} · ${when}` : `Sincronizado · ${when}`);
  };

  useEffect(() => {
    getPreferences().then((preferences) => {
      setDisplayName(preferences.displayName);
      setWater(String(preferences.waterMl));
      setCalories(String(preferences.calories));
      setSleep(String(preferences.sleepHours));
    });
    getClaudeKey().then(setClaudeKey);
    refreshClaude();
  }, []);

  const onSave = async () => {
    const preferences: Preferences = {
      displayName: displayName.trim(),
      waterMl: asNumber(water, 2000),
      calories: asNumber(calories, 2000),
      sleepHours: asNumber(sleep, 7),
    };
    setSaving(true);
    try {
      await savePreferences(preferences);
      await saveClaudeKey(claudeKey);
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('No se ha guardado');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.help}>El nombre y los objetivos se guardan en este dispositivo.</Text>
        <Input label="Nombre" value={displayName} onChangeText={setDisplayName} placeholder="Tu nombre" />
        <Input label="Agua (ml)" value={water} onChangeText={setWater} keyboardType="number-pad" />
        <Input label="Calorías" value={calories} onChangeText={setCalories} keyboardType="number-pad" />
        <Input label="Sueño (horas)" value={sleep} onChangeText={setSleep} keyboardType="decimal-pad" />
        <Text style={styles.help}>
          La suscripción Pro no incluye la API. La clave se crea en console.anthropic.com y se queda en este dispositivo. Con ella, Hoy envía tareas, hábitos y el día; Claude solo añade lo que falte.
        </Text>
        <Input
          label="Clave de Claude"
          value={claudeKey}
          onChangeText={setClaudeKey}
          placeholder="sk-ant-..."
          secureTextEntry
          autoCapitalize="none"
        />
        <Text style={styles.status}>{claudeStatus}</Text>
        <Button
          title="Sincronizar ahora"
          variant="secondary"
          loading={syncing}
          onPress={async () => {
            setSyncing(true);
            try {
              await saveClaudeKey(claudeKey);
              await syncWithClaude();
              await refreshClaude();
            } finally {
              setSyncing(false);
            }
          }}
        />
        <Button title="Guardar" onPress={onSave} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  help: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, lineHeight: 20, color: Colors.textSecondary },
  status: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, lineHeight: 20, color: Colors.textMuted },
});

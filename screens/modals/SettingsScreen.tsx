import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { getClaudeState, setClaudeConsent, syncWithClaude } from '../../services/claudeSync';
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
  const [claudeConsent, setConsent] = useState(false);
  const [claudeStatus, setClaudeStatus] = useState('Desactivado.');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const refreshClaude = async () => {
    const state = await getClaudeState();
    setConsent(state.consent);
    if (!state.consent) {
      setClaudeStatus('Desactivado. No se envía nada.');
      return;
    }
    if (!state.account) {
      setClaudeStatus('Sin conexión con tu cuenta. Se sincroniza cuando vuelva.');
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
        <View style={styles.row}>
          <Text style={styles.label}>Resumen y tareas con Claude</Text>
          <Switch
            value={claudeConsent}
            onValueChange={async (value) => {
              setConsent(value);
              await setClaudeConsent(value);
              await refreshClaude();
            }}
          />
        </View>
        <Text style={styles.help}>
          Si lo activas, al abrir Hoy se envían a Claude (Anthropic) tus objetivos, el agua, el ánimo, las calorías, el sueño, si entrenaste, los hábitos de hoy y las tareas abiertas. Claude devuelve una frase y, si falta algo claro, añade tareas. No borra ni completa nada.
        </Text>
        <Text style={styles.status}>{claudeStatus}</Text>
        <Button
          title="Sincronizar ahora"
          variant="secondary"
          loading={syncing}
          disabled={!claudeConsent}
          onPress={async () => {
            setSyncing(true);
            try {
              await syncWithClaude({ manual: true });
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  label: { flex: 1, fontFamily: Typography.fontMedium, fontSize: Typography.md, color: Colors.textPrimary },
  status: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, lineHeight: 20, color: Colors.textMuted },
});

import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { createConnectorUrl, getConnectorStatus, revokeConnector } from '../../services/claudeConnector';
import { getPreferences, Preferences, savePreferences } from '../../services/preferencesService';
import { applyReminders, getReminders, parseReminderTime, ReminderSettings, ReminderSlot } from '../../services/reminders';

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
  const [saving, setSaving] = useState(false);
  const [connectorStatus, setConnectorStatus] = useState('Comprobando…');
  const [connectorAccount, setConnectorAccount] = useState(false);
  const [connectorActive, setConnectorActive] = useState(false);
  const [connectorLink, setConnectorLink] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reminders, setReminders] = useState<ReminderSettings | null>(null);

  const refreshConnector = async () => {
    const status = await getConnectorStatus();
    setConnectorAccount(status.account);
    setConnectorActive(status.active);
    if (!status.account) {
      setConnectorStatus('Sin conexión con tu cuenta. Vuelve a intentarlo con internet.');
    } else if (!status.active) {
      setConnectorStatus('Sin conectar.');
    } else {
      const used = status.lastUsedAt ? new Date(status.lastUsedAt).toLocaleString('es') : 'todavía no';
      setConnectorStatus(`Enlace activo · último uso de Claude: ${used}`);
    }
  };

  const onCreateLink = async () => {
    setConnecting(true);
    setCopied(false);
    try {
      setConnectorLink(await createConnectorUrl());
      await refreshConnector();
    } catch (error) {
      Alert.alert(error instanceof Error ? error.message : 'No se ha podido crear el enlace.');
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    getPreferences().then((preferences) => {
      setDisplayName(preferences.displayName);
      setWater(String(preferences.waterMl));
      setCalories(String(preferences.calories));
      setSleep(String(preferences.sleepHours));
    });
    refreshConnector().catch(() => setConnectorStatus('No se ha podido comprobar.'));
    getReminders().then(setReminders).catch((error) => console.error(error));
  }, []);

  const commitReminders = async (next: ReminderSettings) => {
    try {
      const saved = await applyReminders(next);
      if (!saved) {
        Alert.alert(Platform.OS === 'web' ? 'Solo en el móvil' : 'Sin permiso', Platform.OS === 'web' ? 'Los recordatorios se programan en la app de Android.' : 'Activa las notificaciones de Lifepp en los ajustes del sistema.');
        return;
      }
      setReminders(saved);
    } catch (error) {
      console.error(error);
      Alert.alert('No se ha podido programar el aviso');
    }
  };

  const onToggleReminder = (key: keyof ReminderSettings, enabled: boolean) => {
    if (!reminders) return;
    const time = parseReminderTime(reminders[key].time);
    if (enabled && !time) {
      Alert.alert('Usa el formato hh:mm');
      return;
    }
    void commitReminders({ ...reminders, [key]: { ...reminders[key], enabled, time: time?.label ?? reminders[key].time } });
  };

  const onReminderTime = (key: keyof ReminderSettings, time: string) => {
    if (!reminders) return;
    setReminders({ ...reminders, [key]: { ...reminders[key], time } });
  };

  const onReminderTimeEnd = (key: keyof ReminderSettings) => {
    if (!reminders) return;
    const time = parseReminderTime(reminders[key].time);
    if (!time) {
      Alert.alert('Usa el formato hh:mm');
      getReminders().then(setReminders).catch((error) => console.error(error));
      return;
    }
    void commitReminders({ ...reminders, [key]: { enabled: reminders[key].enabled, time: time.label } });
  };

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
        <Text style={styles.section}>Recordatorios</Text>
        <Text style={styles.help}>Avisos en este móvil, a la hora que elijas.</Text>
        {reminders
          ? ([
              ['water', 'Agua'],
              ['habits', 'Hábitos pendientes'],
              ['tasks', 'Tareas de hoy'],
            ] as const).map(([key, label]) => (
              <ReminderLine
                key={key}
                label={label}
                slot={reminders[key]}
                onToggle={(enabled) => onToggleReminder(key, enabled)}
                onTime={(time) => onReminderTime(key, time)}
                onTimeEnd={() => onReminderTimeEnd(key)}
              />
            ))
          : null}
        <Text style={styles.section}>Conectar con Claude</Text>
        <Text style={styles.help}>
          Añade Lifepp como conector en claude.ai (sirve también en la app de Claude del móvil). Claude podrá ver tu día y apuntar o cambiar tareas cuando se lo pidas. Usa tu plan de Claude; no hace falta API key.
        </Text>
        <Text style={styles.status}>{connectorStatus}</Text>
        {connectorLink ? (
          <View style={styles.linkBox}>
            <Text selectable style={styles.link}>
              {connectorLink}
            </Text>
            <Button
              title={copied ? 'Copiado' : 'Copiar enlace'}
              variant="secondary"
              onPress={async () => {
                await Clipboard.setStringAsync(connectorLink);
                setCopied(true);
              }}
            />
            <Text style={styles.help}>
              En claude.ai: Personalizar → Conectores → Añadir conector personalizado. Pega el enlace como URL y elige «Sin inicio de sesión». El enlace funciona como una contraseña: no lo compartas. Solo se muestra ahora.
            </Text>
          </View>
        ) : null}
        <Button
          title={connectorActive ? 'Crear enlace nuevo' : 'Crear enlace'}
          variant="secondary"
          loading={connecting}
          disabled={!connectorAccount}
          onPress={() => {
            if (!connectorActive) {
              void onCreateLink();
              return;
            }
            Alert.alert('Crear enlace nuevo', 'El enlace anterior dejará de funcionar en Claude.', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Crear', onPress: () => void onCreateLink() },
            ]);
          }}
        />
        {connectorActive ? (
          <Button
            title="Desconectar Claude"
            variant="secondary"
            onPress={() =>
              Alert.alert('Desconectar Claude', 'Claude dejará de ver tus datos. Puedes volver a conectarlo cuando quieras.', [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Desconectar',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await revokeConnector();
                      setConnectorLink('');
                      await refreshConnector();
                    } catch (error) {
                      Alert.alert(error instanceof Error ? error.message : 'No se ha podido desconectar.');
                    }
                  },
                },
              ])
            }
          />
        ) : null}
        <Button title="Guardar" onPress={onSave} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const ReminderLine = ({
  label,
  slot,
  onToggle,
  onTime,
  onTimeEnd,
}: {
  label: string;
  slot: ReminderSlot;
  onToggle: (enabled: boolean) => void;
  onTime: (time: string) => void;
  onTimeEnd: () => void;
}) => (
  <View style={styles.reminder}>
    <Text style={styles.reminderLabel}>{label}</Text>
    <TextInput
      accessibilityLabel={`Hora de ${label}`}
      value={slot.time}
      onChangeText={onTime}
      onEndEditing={onTimeEnd}
      keyboardType="numbers-and-punctuation"
      maxLength={5}
      style={styles.time}
    />
    <Switch
      accessibilityLabel={label}
      value={slot.enabled}
      onValueChange={onToggle}
      trackColor={{ false: Colors.border, true: Colors.gold }}
      thumbColor={Colors.white}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  help: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, lineHeight: 20, color: Colors.textSecondary },
  section: { fontFamily: Typography.fontMedium, fontSize: Typography.md, color: Colors.textPrimary, marginTop: Spacing.md },
  linkBox: { gap: Spacing.sm, padding: Spacing.md, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  link: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, lineHeight: 20, color: Colors.textPrimary },
  status: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, lineHeight: 20, color: Colors.textMuted },
  reminder: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  reminderLabel: { flex: 1, fontFamily: Typography.fontMedium, fontSize: Typography.md, color: Colors.textPrimary },
  time: {
    width: 72,
    minHeight: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    textAlign: 'center',
    fontFamily: Typography.fontMedium,
    fontSize: Typography.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
});

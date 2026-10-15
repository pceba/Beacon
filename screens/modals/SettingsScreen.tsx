import React, { useEffect, useState } from 'react';
import { ConfirmSheet } from '../../components/ui/ConfirmSheet';
import { warning } from '../../lib/haptics';
import { toast } from '../../lib/toast';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
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
  const [confirm, setConfirm] = useState<null | 'link' | 'disconnect'>(null);
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
      toast.show({ message: 'No se ha podido crear el enlace.', kind: 'error' });
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
        toast.show({ message: Platform.OS === 'web' ? 'Los recordatorios se programan en el móvil.' : 'Activa las notificaciones de Lifepp en los ajustes del sistema.', kind: 'error' });
        return;
      }
      setReminders(saved);
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha podido programar el aviso', kind: 'error' });
    }
  };

  const onToggleReminder = (key: keyof ReminderSettings, enabled: boolean) => {
    if (!reminders) return;
    const time = parseReminderTime(reminders[key].time);
    if (enabled && !time) {
      toast.show({ message: 'Usa el formato hh:mm', kind: 'error' });
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
      toast.show({ message: 'Usa el formato hh:mm', kind: 'error' });
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
      toast.show({ message: 'No se ha guardado', kind: 'error' });
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
            setConfirm('link');
          }}
        />
        {connectorActive ? (
          <Button title="Desconectar Claude" variant="secondary" onPress={() => setConfirm('disconnect')} />
        ) : null}
        <Button title="Guardar" onPress={onSave} loading={saving} />
      </ScrollView>
      <ConfirmSheet
        visible={confirm === 'link'}
        title="¿Crear un enlace nuevo?"
        body="El enlace anterior dejará de funcionar en Claude."
        confirmLabel="Crear enlace"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          warning();
          setConfirm(null);
          void onCreateLink();
        }}
      />
      <ConfirmSheet
        visible={confirm === 'disconnect'}
        title="¿Desconectar Claude?"
        body="Claude dejará de ver tus datos. Puedes volver a conectarlo cuando quieras."
        confirmLabel="Desconectar"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          warning();
          setConfirm(null);
          void (async () => {
            try {
              await revokeConnector();
              setConnectorLink('');
              await refreshConnector();
            } catch (error) {
              console.error(error);
              toast.show({ message: 'No se ha podido desconectar.', kind: 'error' });
            }
          })();
        }}
      />
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
      trackColor={{ false: Colors.border, true: Colors.accent }}
      thumbColor={Colors.surface}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  help: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, lineHeight: 20, color: Colors.text2 },
  section: { fontFamily: Typography.fontMedium, fontSize: Typography.md, color: Colors.ink, marginTop: Spacing.md },
  linkBox: { gap: Spacing.sm, padding: Spacing.md, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  link: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, lineHeight: 20, color: Colors.ink },
  status: { fontFamily: Typography.fontRegular, fontSize: Typography.sm, lineHeight: 20, color: Colors.text3 },
  reminder: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  reminderLabel: { flex: 1, fontFamily: Typography.fontMedium, fontSize: Typography.md, color: Colors.ink },
  time: {
    width: 72,
    minHeight: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    textAlign: 'center',
    fontFamily: Typography.fontMedium,
    fontSize: Typography.md,
    color: Colors.ink,
    backgroundColor: Colors.surface,
  },
});

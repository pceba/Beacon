import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { TriangleAlert } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmailCodeFlow } from '../../components/auth/EmailCodeFlow';
import { ConfirmSheet } from '../../components/ui/ConfirmSheet';
import { BeaconMark } from '../../components/ui/BeaconMark';
import { ListRow } from '../../components/ui/ListRow';
import { Stepper } from '../../components/ui/Stepper';
import { Switch } from '../../components/ui/Switch';
import { TimePill } from '../../components/ui/TimePill';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Type } from '../../constants/typography';
import { warning } from '../../lib/haptics';
import { rawSupabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { confirmEmailLink, requestEmailLink } from '../../services/emailAuth';
import { createConnectorUrl, getConnectorStatus, revokeConnector } from '../../services/claudeConnector';
import { getPreferences, Preferences, savePreferences } from '../../services/preferencesService';
import { applyReminders, getReminders, ReminderSettings } from '../../services/reminders';
import { formatHours, formatNumber, formatRelative, formatWater } from '../../utils/format';
import app from '../../app.json';

export const SettingsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | 'new-link' | 'disconnect'>(null);
  const [connectorActive, setConnectorActive] = useState(false);
  const [connectorAccount, setConnectorAccount] = useState(false);
  const [lastUsed, setLastUsed] = useState<string | null>(null);
  const [connectorLink, setConnectorLink] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [reminders, setReminders] = useState<ReminderSettings | null>(null);

  const refreshUser = async () => {
    const { data } = await rawSupabase.auth.getUser();
    setEmail(data.user?.email ?? null);
  };

  const refreshConnector = async () => {
    const status = await getConnectorStatus();
    setConnectorAccount(status.account);
    setConnectorActive(status.active);
    setLastUsed(status.lastUsedAt);
  };

  useEffect(() => {
    getPreferences().then(setPrefs).catch((error) => console.error(error));
    refreshUser().catch((error) => console.error(error));
    refreshConnector().catch((error) => console.error(error));
    getReminders().then(setReminders).catch((error) => console.error(error));
  }, []);

  const updatePrefs = (patch: Partial<Preferences>) => {
    setPrefs((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      void savePreferences(next);
      return next;
    });
  };

  const commitReminders = async (next: ReminderSettings) => {
    try {
      const saved = await applyReminders(next);
      if (!saved) {
        toast.show({
          message: Platform.OS === 'web' ? 'Los recordatorios se programan en el móvil.' : 'Activa las notificaciones de Beacon en los ajustes del sistema.',
          kind: 'error',
        });
        return;
      }
      setReminders(saved);
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha podido programar el aviso.', kind: 'error' });
    }
  };

  const onCreateLink = async () => {
    setConnecting(true);
    try {
      setConnectorLink(await createConnectorUrl());
      await refreshConnector();
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha podido crear el enlace.', kind: 'error' });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.title}>Ajustes</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Listo" onPress={() => navigation.goBack()} style={styles.done}>
          <Text style={styles.doneText}>Listo</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        {!email ? (
          <View style={styles.banner}>
            <TriangleAlert color={Colors.warning} size={18} />
            <View style={styles.bannerCopy}>
              <Text style={styles.bannerTitle}>Vincula tu email</Text>
              <Text style={styles.bannerText}>Así no pierdes los datos si cambias de móvil. El código no se puede enviar ahora; todo sigue guardado en este móvil.</Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.group}>Cuenta</Text>
        <View style={styles.groupCard}>
          <ListRow title="Email" value={email ?? 'Vincular'} valueColor={email ? Colors.text3 : Colors.accent} chevron onPress={() => setLinkOpen(true)} last />
        </View>

        {prefs ? (
          <>
            <Text style={styles.group}>Objetivos</Text>
            <View style={styles.groupCard}>
              <View style={styles.goal}>
                <Text style={styles.goalLabel}>Agua</Text>
                <Stepper
                  value={formatWater(prefs.waterMl)}
                  decrementLabel="Menos agua"
                  incrementLabel="Más agua"
                  onDecrement={() => updatePrefs({ waterMl: Math.max(250, prefs.waterMl - 250) })}
                  onIncrement={() => updatePrefs({ waterMl: prefs.waterMl + 250 })}
                />
              </View>
              <View style={styles.goal}>
                <Text style={styles.goalLabel}>Calorías</Text>
                <Stepper
                  value={formatNumber(prefs.calories)}
                  decrementLabel="Menos calorías"
                  incrementLabel="Más calorías"
                  onDecrement={() => updatePrefs({ calories: Math.max(50, prefs.calories - 50) })}
                  onIncrement={() => updatePrefs({ calories: prefs.calories + 50 })}
                />
              </View>
              <View style={[styles.goal, styles.last]}>
                <Text style={styles.goalLabel}>Sueño</Text>
                <Stepper
                  value={formatHours(prefs.sleepHours)}
                  decrementLabel="Menos sueño"
                  incrementLabel="Más sueño"
                  onDecrement={() => updatePrefs({ sleepHours: Math.max(0.5, Math.round((prefs.sleepHours - 0.5) * 2) / 2) })}
                  onIncrement={() => updatePrefs({ sleepHours: Math.round((prefs.sleepHours + 0.5) * 2) / 2 })}
                />
              </View>
            </View>
          </>
        ) : null}

        <Text style={styles.group}>Recordatorios</Text>
        <View style={styles.groupCard}>
          {reminders
            ? (['water', 'habits', 'tasks'] as const).map((key) => {
                const label = key === 'water' ? 'Agua' : key === 'habits' ? 'Hábitos' : 'Tareas';
                return (
                  <View key={key} style={styles.goal}>
                    <Text style={styles.goalLabel}>{label}</Text>
                    <TimePill
                      label={label}
                      value={reminders[key].time}
                      onChange={(time) => void commitReminders({ ...reminders, [key]: { ...reminders[key], time } })}
                    />
                    <Switch
                      label={label}
                      value={reminders[key].enabled}
                      onValueChange={(enabled) => void commitReminders({ ...reminders, [key]: { ...reminders[key], enabled } })}
                    />
                  </View>
                );
              })
            : null}
          <Text style={styles.note}>Solo te avisamos si aún no has cumplido ese objetivo.</Text>
        </View>

        <Text style={styles.group}>Claude</Text>
        <View style={styles.groupCard}>
          <View style={styles.claude}>
            <View style={[styles.dot, { backgroundColor: connectorActive ? Colors.success : Colors.text4 }]} />
            <Text style={styles.goalLabel}>
              {connectorActive
                ? `Conectado · último uso ${lastUsed ? formatRelative(lastUsed) : 'todavía no'}`
                : 'Sin conectar · Crea un enlace y pégalo en Claude'}
            </Text>
          </View>
          {connectorLink ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Copiar enlace"
              onPress={() => void Clipboard.setStringAsync(connectorLink).then(() => toast.show({ message: 'Enlace copiado.', kind: 'info' }))}
              style={styles.linkBox}
            >
              <Text style={styles.link}>Toca para copiar el enlace. Solo se muestra ahora.</Text>
            </Pressable>
          ) : null}
          <Button
            title="Crear enlace nuevo"
            variant="secondary"
            size="md"
            loading={connecting}
            onPress={() => {
              if (connectorActive) setConfirm('new-link');
              else void onCreateLink();
            }}
          />
          {connectorActive ? (
            <Button title="Desconectar" variant="danger" size="md" onPress={() => setConfirm('disconnect')} />
          ) : null}
        </View>

        <View style={styles.brand}>
          <BeaconMark size={18} color={Colors.text4} dimOpacity={0.4} />
          <Text style={styles.version}>Beacon {app.expo.version}</Text>
        </View>
      </ScrollView>

      <EmailCodeFlow
        visible={linkOpen}
        title="Vincular email"
        body="Te enviaremos un código de 6 cifras. Tu cuenta sigue siendo la misma."
        onClose={() => setLinkOpen(false)}
        onRequest={requestEmailLink}
        onConfirm={async (address, code) => {
          await confirmEmailLink(address, code);
          await refreshUser();
          toast.show({ message: 'Email vinculado.', kind: 'success' });
        }}
      />
      <ConfirmSheet
        visible={confirm === 'new-link'}
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
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg },
  title: { ...Type.title, fontSize: 28, lineHeight: 34, color: Colors.ink },
  done: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  doneText: { ...Type.bodyStrong, color: Colors.accent },
  content: { paddingHorizontal: Spacing.lg, gap: 8 },
  banner: { backgroundColor: Colors.warningSoft, borderRadius: 18, padding: 16, gap: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start' },
  bannerCopy: { flex: 1, gap: 4 },
  bannerTitle: { ...Type.bodyStrong, color: Colors.ink },
  bannerText: { ...Type.body, color: Colors.text2 },
  group: { ...Type.label, color: Colors.text3, marginTop: 12, marginBottom: 6 },
  groupCard: { backgroundColor: Colors.surface, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 4 },
  goal: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.line },
  last: { borderBottomWidth: 0 },
  goalLabel: { ...Type.body, color: Colors.ink, flex: 1 },
  note: { ...Type.caption, color: Colors.text3, paddingVertical: 12 },
  claude: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  linkBox: { minHeight: 44, justifyContent: 'center', marginBottom: 8 },
  link: { ...Type.caption, color: Colors.accent },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24 },
  version: { ...Type.caption, color: Colors.text4, textAlign: 'center' },
});

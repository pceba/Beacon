import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Type, tabular } from '../../constants/typography';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';

type Props = {
  visible: boolean;
  title: string;
  body: string;
  onClose: () => void;
  onRequest: (email: string) => Promise<void>;
  onConfirm: (email: string, code: string) => Promise<void>;
};

export const EmailCodeFlow = ({ visible, title, body, onClose, onRequest, onConfirm }: Props) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setSent(false);
    setCode('');
    setError('');
    setBusy(false);
  };

  const send = async () => {
    const next = email.trim().toLowerCase();
    if (!next.includes('@')) {
      setError('Escribe un email válido.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onRequest(next);
      setEmail(next);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido enviar el código.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (code.trim().length < 6) {
      setError('El código tiene 6 cifras.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onConfirm(email, code.trim());
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido verificar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={() => {
        reset();
        onClose();
      }}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{sent ? `Te hemos enviado un código a ${email}.` : body}</Text>
      {sent ? (
        <TextInput
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          placeholder="000000"
          placeholderTextColor={Colors.text4}
          accessibilityLabel="Código de 6 cifras"
          style={styles.code}
          maxFontSizeMultiplier={1.3}
        />
      ) : (
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="tu@email.com"
          placeholderTextColor={Colors.text4}
          accessibilityLabel="Email"
          style={styles.email}
        />
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={sent ? 'Verificar código' : 'Enviar código'} onPress={() => void (sent ? confirm() : send())} loading={busy} />
      {sent ? (
        <Pressable accessibilityRole="button" onPress={() => void send()} style={styles.again}>
          <Text style={styles.againText}>Enviar otro código</Text>
        </Pressable>
      ) : null}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  title: { ...Type.headline, color: Colors.ink, marginBottom: Spacing.sm },
  body: { ...Type.body, color: Colors.text2, marginBottom: Spacing.md },
  email: { ...Type.body, color: Colors.ink, minHeight: 52, borderBottomWidth: 2, borderBottomColor: Colors.accent, marginBottom: Spacing.md },
  code: { ...Type.display, ...tabular, fontSize: 36, lineHeight: 44, color: Colors.ink, letterSpacing: 8, marginBottom: Spacing.md },
  error: { ...Type.caption, color: Colors.danger, marginBottom: Spacing.sm },
  again: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  againText: { ...Type.bodyStrong, color: Colors.accent },
});

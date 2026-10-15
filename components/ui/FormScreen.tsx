import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Type } from '../../constants/typography';
import { Button } from './Button';

type Props = {
  title: string;
  saveLabel: string;
  onSave: () => void;
  loading?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export const FormScreen = ({ title, saveLabel, onSave, loading, children, footer }: Props) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cancelar" onPress={() => navigation.goBack()} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.cancel} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} keyboardShouldPersistTaps="handled">
        {children}
        {footer}
      </ScrollView>
      <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button title={saveLabel} onPress={onSave} loading={loading} />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cancel: { minWidth: 88, minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.lg },
  cancelText: { ...Type.body, color: Colors.text2 },
  title: { ...Type.bodyStrong, color: Colors.ink },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: 8,
    backgroundColor: Colors.bg,
  },
});

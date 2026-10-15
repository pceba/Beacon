import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Type } from '../../constants/typography';
import { registerToast, ToastPayload } from '../../lib/toast';

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<(ToastPayload & { id: number }) | null>(null);

  useEffect(() => {
    registerToast((next) => setItem({ ...next, id: Date.now() }));
    return () => registerToast(null);
  }, []);

  useEffect(() => {
    if (!item) return;
    const timer = setTimeout(() => setItem(null), 4000);
    return () => clearTimeout(timer);
  }, [item]);

  return (
    <View style={styles.host}>
      {children}
      {item ? (
        <View accessibilityLiveRegion="polite" style={[styles.toast, { bottom: insets.bottom + 72 }]}>
          <Text style={styles.message}>{item.message}</Text>
          {item.action ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.action.label}
              hitSlop={8}
              onPress={() => {
                const action = item.action;
                setItem(null);
                action?.onPress();
              }}
              style={styles.action}
            >
              <Text style={styles.actionText}>{item.action.label}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  host: { flex: 1 },
  toast: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    minHeight: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.ink,
    paddingHorizontal: Spacing.s16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  message: { ...Type.body, color: Colors.surface, flex: 1 },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  actionText: { ...Type.bodyStrong, color: Colors.surface },
});

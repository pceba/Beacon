import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Type } from '../../constants/typography';
import { registerRouteToast, registerToast, ToastPayload } from '../../lib/toast';

const TABS = new Set(['Today', 'Journal', 'Stats', 'PlanHomeScreen']);
const FORMS = new Set([
  'LogMealScreen',
  'LogWorkoutScreen',
  'WorkoutDetailScreen',
  'LogSleepScreen',
  'LogBodyScreen',
  'AddHabitModal',
  'AddReflectionModal',
  'AddNoteModal',
  'AddTaskModal',
  'EventDetailScreen',
]);

const offsetFor = (route: string, inset: number) => {
  const tab = inset + 58 + 12;
  const dock = Math.max(inset, 12) + 56 + 8 + 12;
  if (TABS.has(route)) return tab;
  if (route === 'EventDetailScreen') return tab + dock;
  if (FORMS.has(route)) return dock;
  return inset + 16;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<(ToastPayload & { id: number }) | null>(null);
  const [route, setRoute] = useState('Today');
  const routeRef = useRef<string | null>(null);
  const translateY = useSharedValue(0);

  useEffect(() => {
    registerToast((next) => {
      translateY.value = 0;
      setItem({ ...next, id: Date.now() });
    });
    registerRouteToast((name) => {
      if (routeRef.current && routeRef.current !== name) {
        setItem((current) => (current?.action ? current : null));
      }
      routeRef.current = name;
      setRoute(name);
    });
    return () => {
      registerToast(null);
      registerRouteToast(null);
    };
  }, [translateY]);

  useEffect(() => {
    if (!item) return;
    const timer = setTimeout(() => setItem(null), item.action ? 6000 : 4000);
    return () => clearTimeout(timer);
  }, [item]);

  const dismiss = () => setItem(null);
  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationY > 28) {
        translateY.value = withTiming(80, { duration: 120 });
        runOnJS(dismiss)();
        return;
      }
      translateY.value = withTiming(0, { duration: 120 });
    });
  const motion = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return (
    <View style={styles.host}>
      {children}
      {item ? (
        <GestureDetector gesture={pan}>
          <Animated.View accessibilityLiveRegion="polite" style={[styles.toast, motion, { bottom: offsetFor(route, insets.bottom) }]}>
            <Text numberOfLines={2} style={styles.message}>
              {item.message}
            </Text>
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
          </Animated.View>
        </GestureDetector>
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
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.ink,
    paddingHorizontal: Spacing.s16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  message: { ...Type.body, color: Colors.surface, flex: 1 },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  actionText: { ...Type.bodyStrong, color: Colors.surface },
});

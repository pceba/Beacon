import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart2, BookOpen, CalendarDays, Plus, Sun } from 'lucide-react-native';
import { MainTabParamList, PlanStackParamList } from '../types/navigation';
import { Colors } from '../constants/colors';
import { Type } from '../constants/typography';
import { soft } from '../lib/haptics';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { TodayScreen } from '../features/today/TodayScreen';
import { JournalScreen } from '../features/journal/JournalScreen';
import { PlanScreen } from '../features/plan/PlanScreen';
import { EventDetailScreen } from '../features/plan/EventDetailScreen';
import { DatosScreen } from '../features/insights/DatosScreen';
import { openAddSheet } from '../components/add/AddSheet';

const Tab = createBottomTabNavigator<MainTabParamList>();
const PlanStack = createNativeStackNavigator<PlanStackParamList>();

const stackOptions = {
  headerBackButtonDisplayMode: 'minimal' as const,
  headerStyle: { backgroundColor: Colors.bg },
  headerShadowVisible: false,
  headerTintColor: Colors.ink,
  headerTitleStyle: {
    fontFamily: Type.section.fontFamily,
    fontSize: 16,
    color: Colors.ink,
  },
  contentStyle: { backgroundColor: Colors.bg },
};

const PlanNavigator = () => (
  <PlanStack.Navigator screenOptions={stackOptions}>
    <PlanStack.Screen name="PlanHomeScreen" component={PlanScreen} options={{ headerShown: false }} />
    <PlanStack.Screen name="EventDetailScreen" component={EventDetailScreen} options={{ headerShown: false }} />
  </PlanStack.Navigator>
);

const slots = [
  { name: 'Today' as const, label: 'Hoy', icon: Sun },
  { name: 'Plan' as const, label: 'Plan', icon: CalendarDays },
  { name: 'Journal' as const, label: 'Diario', icon: BookOpen },
  { name: 'Stats' as const, label: 'Datos', icon: BarChart2 },
];

const PRESS = { damping: 18, stiffness: 300 };

const BeaconTabBar = ({ state, navigation, onAdd }: BottomTabBarProps & { onAdd: () => void }) => {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const fabMotion = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  const left = slots.slice(0, 2);
  const right = slots.slice(2);
  const barHeight = 58 + insets.bottom;

  const tab = (item: (typeof slots)[number]) => {
    const route = state.routes.find((entry) => entry.name === item.name);
    const focused = state.routes[state.index]?.name === item.name;
    const Icon = item.icon;
    return (
      <Pressable
        key={item.name}
        accessibilityRole="tab"
        accessibilityLabel={item.label}
        accessibilityState={{ selected: focused }}
        onPress={() => {
          if (!route) return;
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        }}
        style={styles.tab}
      >
        <Icon color={focused ? Colors.ink : Colors.text3} size={22} />
        <Text style={[styles.label, focused ? styles.labelOn : null]}>{item.label}</Text>
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={{ height: barHeight + 26 }}>
      <View style={[styles.bar, { height: barHeight, paddingBottom: insets.bottom }]}>
        {left.map(tab)}
        <View style={styles.fabSlot} />
        {right.map(tab)}
      </View>
      <View pointerEvents="box-none" style={styles.fabAnchor}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Añadir"
          hitSlop={8}
          onPress={() => {
            soft();
            onAdd();
          }}
          onPressIn={() => {
            if (reduce) {
              opacity.value = withTiming(0.72, { duration: 120 });
              return;
            }
            scale.value = withSpring(0.94, PRESS);
          }}
          onPressOut={() => {
            if (reduce) {
              opacity.value = withTiming(1, { duration: 120 });
              return;
            }
            scale.value = withSpring(1, PRESS);
          }}
          style={styles.fabHit}
        >
          <Animated.View style={[styles.fab, fabMotion]}>
            <Plus color={Colors.surface} size={26} />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
};

const renderTabBar = (props: BottomTabBarProps) => <BeaconTabBar {...props} onAdd={openAddSheet} />;
const tabScreenOptions = { headerShown: false };

export const MainTabs = () => {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions} tabBar={renderTabBar}>
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Plan" component={PlanNavigator} />
      <Tab.Screen name="Journal" component={JournalScreen} />
      <Tab.Screen name="Stats" component={DatosScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tab: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 2, paddingBottom: 6 },
  label: { fontFamily: Type.caption.fontFamily, fontSize: 11, color: Colors.text3 },
  labelOn: { fontFamily: Type.bodyStrong.fontFamily, color: Colors.ink },
  fabSlot: { width: 76 },
  fabAnchor: { position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center' },
  fabHit: { width: 56, height: 56 },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 8,
  },
});

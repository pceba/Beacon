import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart2, BookOpen, CalendarDays, Plus, Sun } from 'lucide-react-native';
import { MainTabParamList, PlanStackParamList } from '../types/navigation';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';
import { soft } from '../lib/haptics';
import { TodayScreen } from '../screens/TodayScreen';
import { JournalScreen } from '../screens/JournalScreen';
import { PlanHomeScreen } from '../screens/plan/PlanHomeScreen';
import { EventDetailScreen } from '../screens/plan/EventDetailScreen';
import { DatosScreen } from '../screens/DatosScreen';
import { AddSheet } from '../components/add/AddSheet';

const Tab = createBottomTabNavigator<MainTabParamList>();
const PlanStack = createNativeStackNavigator<PlanStackParamList>();

const stackOptions = {
  headerBackButtonDisplayMode: 'minimal' as const,
  headerStyle: { backgroundColor: Colors.bg },
  headerShadowVisible: false,
  headerTintColor: Colors.ink,
  headerTitleStyle: {
    fontFamily: Typography.fontBold,
    fontSize: 16,
    color: Colors.ink,
  },
  contentStyle: { backgroundColor: Colors.bg },
};

const PlanNavigator = () => (
  <PlanStack.Navigator screenOptions={stackOptions}>
    <PlanStack.Screen name="PlanHomeScreen" component={PlanHomeScreen} options={{ headerShown: false }} />
    <PlanStack.Screen name="EventDetailScreen" component={EventDetailScreen} options={{ title: 'Evento' }} />
  </PlanStack.Navigator>
);

const slots = [
  { name: 'Today' as const, label: 'Hoy', icon: Sun },
  { name: 'Plan' as const, label: 'Plan', icon: CalendarDays },
  { name: 'Journal' as const, label: 'Diario', icon: BookOpen },
  { name: 'Stats' as const, label: 'Datos', icon: BarChart2 },
];

const LifeppTabBar = ({ state, navigation, onAdd }: BottomTabBarProps & { onAdd: () => void }) => {
  const insets = useSafeAreaInsets();
  const left = slots.slice(0, 2);
  const right = slots.slice(2);

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
    <View style={[styles.bar, { paddingBottom: insets.bottom, height: 58 + insets.bottom }]}>
      {left.map(tab)}
      <View style={styles.fabSlot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Añadir"
          onPress={() => {
            soft();
            onAdd();
          }}
          style={styles.fab}
        >
          <Plus color={Colors.surface} size={26} />
        </Pressable>
      </View>
      {right.map(tab)}
    </View>
  );
};

export const MainTabs = () => {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <LifeppTabBar {...props} onAdd={() => setAddOpen(true)} />}
      >
        <Tab.Screen name="Today" component={TodayScreen} />
        <Tab.Screen name="Plan" component={PlanNavigator} />
        <Tab.Screen name="Journal" component={JournalScreen} />
        <Tab.Screen name="Stats" component={DatosScreen} />
      </Tab.Navigator>
      <AddSheet visible={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderTopWidth: 1,
    borderTopColor: '#E4E8EE',
  },
  tab: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 2, paddingBottom: 6 },
  label: { fontFamily: Typography.fontMedium, fontSize: 11, color: Colors.text3 },
  labelOn: { fontFamily: Typography.fontBold, color: Colors.ink },
  fabSlot: { width: 76, alignItems: 'center' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    shadowColor: '#101318',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 8,
  },
});

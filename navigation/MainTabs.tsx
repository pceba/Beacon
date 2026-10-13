import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart2, BookOpen, CalendarDays, PenLine, Sun } from 'lucide-react-native';
import { MainTabParamList, LogStackParamList, PlanStackParamList } from '../types/navigation';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';
import { TodayScreen } from '../screens/TodayScreen';
import { LogHomeScreen } from '../screens/log/LogHomeScreen';
import { LogMealScreen } from '../screens/log/LogMealScreen';
import { LogWorkoutScreen } from '../screens/log/LogWorkoutScreen';
import { WorkoutDetailScreen } from '../screens/log/WorkoutDetailScreen';
import { LogSleepScreen } from '../screens/log/LogSleepScreen';
import { LogBodyScreen } from '../screens/log/LogBodyScreen';
import { JournalScreen } from '../screens/JournalScreen';
import { PlanHomeScreen } from '../screens/plan/PlanHomeScreen';
import { EventDetailScreen } from '../screens/plan/EventDetailScreen';
import { StatsScreen } from '../screens/StatsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const LogStack = createNativeStackNavigator<LogStackParamList>();
const PlanStack = createNativeStackNavigator<PlanStackParamList>();

const stackOptions = {
  headerBackButtonDisplayMode: 'minimal' as const,
  headerStyle: { backgroundColor: Colors.background },
  headerShadowVisible: false,
  headerTintColor: Colors.brownPrimary,
  headerTitleStyle: {
    fontFamily: Typography.fontBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  contentStyle: { backgroundColor: Colors.background },
};

const LogNavigator = () => (
  <LogStack.Navigator screenOptions={stackOptions}>
    <LogStack.Screen name="LogHomeScreen" component={LogHomeScreen} options={{ headerShown: false }} />
    <LogStack.Screen name="LogMealScreen" component={LogMealScreen} options={{ title: 'Comida' }} />
    <LogStack.Screen name="LogWorkoutScreen" component={LogWorkoutScreen} options={{ title: 'Entreno' }} />
    <LogStack.Screen name="WorkoutDetailScreen" component={WorkoutDetailScreen} options={{ title: 'Sesión' }} />
    <LogStack.Screen name="LogSleepScreen" component={LogSleepScreen} options={{ title: 'Sueño' }} />
    <LogStack.Screen name="LogBodyScreen" component={LogBodyScreen} options={{ title: 'Cuerpo' }} />
  </LogStack.Navigator>
);

const PlanNavigator = () => (
  <PlanStack.Navigator screenOptions={stackOptions}>
    <PlanStack.Screen name="PlanHomeScreen" component={PlanHomeScreen} options={{ headerShown: false }} />
    <PlanStack.Screen name="EventDetailScreen" component={EventDetailScreen} options={{ title: 'Evento' }} />
  </PlanStack.Navigator>
);

const icons = {
  Today: Sun,
  Log: PenLine,
  Journal: BookOpen,
  Plan: CalendarDays,
  Stats: BarChart2,
} as const;

export const MainTabs = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          elevation: 0,
        },
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: Typography.fontMedium,
          fontSize: 11,
        },
        tabBarIcon: ({ color }) => {
          const Icon = icons[route.name];
          return <Icon color={color} size={20} />;
        },
      })}
    >
      <Tab.Screen name="Today" component={TodayScreen} options={{ tabBarLabel: 'Hoy' }} />
      <Tab.Screen name="Log" component={LogNavigator} options={{ tabBarLabel: 'Registro' }} />
      <Tab.Screen name="Journal" component={JournalScreen} options={{ tabBarLabel: 'Diario' }} />
      <Tab.Screen name="Plan" component={PlanNavigator} options={{ tabBarLabel: 'Plan' }} />
      <Tab.Screen name="Stats" component={StatsScreen} options={{ tabBarLabel: 'Datos' }} />
    </Tab.Navigator>
  );
};

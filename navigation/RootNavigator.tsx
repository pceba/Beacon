import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';
import { RootStackParamList } from '../types/navigation';
import { MainTabs } from './MainTabs';
import { AddHabitModal } from '../screens/modals/AddHabitModal';
import { AddReflectionModal } from '../screens/modals/AddReflectionModal';
import { AddNoteModal } from '../screens/modals/AddNoteModal';
import { AddTaskModal } from '../screens/modals/AddTaskModal';
import { SettingsScreen } from '../screens/modals/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const modalOptions = {
  headerShown: true,
  headerBackButtonDisplayMode: 'minimal' as const,
  presentation: 'modal' as const,
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

export const RootNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="AddHabitModal" component={AddHabitModal} options={{ ...modalOptions, title: 'Hábito' }} />
      <Stack.Screen name="AddReflectionModal" component={AddReflectionModal} options={{ ...modalOptions, title: 'Reflexión' }} />
      <Stack.Screen name="AddNoteModal" component={AddNoteModal} options={{ ...modalOptions, title: 'Nota' }} />
      <Stack.Screen name="AddTaskModal" component={AddTaskModal} options={{ ...modalOptions, title: 'Tarea' }} />
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} options={{ ...modalOptions, title: 'Ajustes' }} />
    </Stack.Navigator>
  );
};

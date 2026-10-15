import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import { RootStackParamList } from '../types/navigation';
import { MainTabs } from './MainTabs';
import { AddHabitModal } from '../screens/modals/AddHabitModal';
import { AddReflectionModal } from '../screens/modals/AddReflectionModal';
import { AddNoteModal } from '../screens/modals/AddNoteModal';
import { AddTaskModal } from '../screens/modals/AddTaskModal';
import { SettingsScreen } from '../screens/modals/SettingsScreen';
import { LogMealScreen } from '../screens/log/LogMealScreen';
import { LogWorkoutScreen } from '../screens/log/LogWorkoutScreen';
import { WorkoutDetailScreen } from '../screens/log/WorkoutDetailScreen';
import { LogSleepScreen } from '../screens/log/LogSleepScreen';
import { LogBodyScreen } from '../screens/log/LogBodyScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const modalOptions = {
  headerShown: false,
  presentation: 'modal' as const,
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
      <Stack.Screen
        name="SettingsScreen"
        component={SettingsScreen}
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Ajustes',
          headerStyle: { backgroundColor: Colors.bg },
          headerShadowVisible: false,
          headerTintColor: Colors.ink,
        }}
      />
      <Stack.Screen name="LogMealScreen" component={LogMealScreen} options={{ ...modalOptions, title: 'Comida' }} />
      <Stack.Screen name="LogWorkoutScreen" component={LogWorkoutScreen} options={{ ...modalOptions, title: 'Entreno' }} />
      <Stack.Screen name="WorkoutDetailScreen" component={WorkoutDetailScreen} options={{ ...modalOptions, title: 'Sesión' }} />
      <Stack.Screen name="LogSleepScreen" component={LogSleepScreen} options={{ ...modalOptions, title: 'Sueño' }} />
      <Stack.Screen name="LogBodyScreen" component={LogBodyScreen} options={{ ...modalOptions, title: 'Cuerpo' }} />
    </Stack.Navigator>
  );
};

import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EmailCodeFlow } from '../components/auth/EmailCodeFlow';
import { Colors } from '../constants/colors';
import { rawSupabase } from '../lib/supabase';
import { toast } from '../lib/toast';
import { getIdentity } from '../services/authService';
import { confirmEmailSignIn, requestEmailSignIn } from '../services/emailAuth';
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
  const [signInOpen, setSignInOpen] = useState(false);

  useEffect(() => {
    rawSupabase.auth
      .getUser()
      .then(({ data }) => {
        if (!data.user?.email) setSignInOpen(true);
      })
      .catch((error) => console.error(error));
  }, []);

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="AddHabitModal" component={AddHabitModal} options={{ ...modalOptions, title: 'Hábito' }} />
      <Stack.Screen name="AddReflectionModal" component={AddReflectionModal} options={{ ...modalOptions, title: 'Reflexión' }} />
      <Stack.Screen name="AddNoteModal" component={AddNoteModal} options={{ ...modalOptions, title: 'Nota' }} />
      <Stack.Screen name="AddTaskModal" component={AddTaskModal} options={{ ...modalOptions, title: 'Tarea' }} />
      <Stack.Screen
        name="SettingsScreen"
        component={SettingsScreen}
        options={{ headerShown: false, presentation: 'modal', contentStyle: { backgroundColor: Colors.bg } }}
      />
      <Stack.Screen name="LogMealScreen" component={LogMealScreen} options={{ ...modalOptions, title: 'Comida' }} />
      <Stack.Screen name="LogWorkoutScreen" component={LogWorkoutScreen} options={{ ...modalOptions, title: 'Entreno' }} />
      <Stack.Screen name="WorkoutDetailScreen" component={WorkoutDetailScreen} options={{ ...modalOptions, title: 'Sesión' }} />
      <Stack.Screen name="LogSleepScreen" component={LogSleepScreen} options={{ ...modalOptions, title: 'Sueño' }} />
      <Stack.Screen name="LogBodyScreen" component={LogBodyScreen} options={{ ...modalOptions, title: 'Cuerpo' }} />
      </Stack.Navigator>
      <EmailCodeFlow
        visible={signInOpen}
        title="Entrar con mi email"
        body="Usa el email que ya vinculaste en Lifepp. No crea una cuenta nueva."
        onClose={() => setSignInOpen(false)}
        onRequest={requestEmailSignIn}
        onConfirm={async (email, code) => {
          await confirmEmailSignIn(email, code);
          await getIdentity();
          toast.show({ message: 'Has entrado con tu email.', kind: 'success' });
        }}
      />
    </>
  );
};

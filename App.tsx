import React, { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import { Colors } from './constants/colors';
import { ToastProvider } from './components/ui/Toast';
import { navigationRef } from './navigation/navigationRef';
import { RootNavigator } from './navigation/RootNavigator';
import { migrateMoodOnce } from './services/moodMigration';
import { bindReminderOpen, syncReminders } from './services/reminders';
import { notifyRoute } from './lib/toast';
// Sube a Supabase lo guardado en local en cuanto hay sesión.
import './services/localSync';

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: '#E4E8EE', alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: 480, backgroundColor: Colors.bg },
});

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.ink,
    background: Colors.bg,
    card: Colors.surface,
    text: Colors.ink,
    border: Colors.border,
  },
};

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: 24, gap: 12 }}>
          <Text style={{ color: Colors.ink, fontSize: 22 }}>Algo ha fallado</Text>
          <Text style={{ color: Colors.text2, fontSize: 16 }}>{this.state.error.message}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
  });

  useEffect(() => {
    syncReminders().catch((error) => console.error(error));
    migrateMoodOnce();
    return bindReminderOpen();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.ink} />
      </View>
    );
  }

  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={styles.stage}>
        <SafeAreaProvider style={styles.column}>
          <ToastProvider>
            <NavigationContainer
              ref={navigationRef}
              theme={navTheme}
              onStateChange={() => {
                const route = navigationRef.getCurrentRoute();
                if (route) notifyRoute(route.name);
              }}
            >
              <StatusBar style="dark" />
              <RootNavigator />
            </NavigationContainer>
          </ToastProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}

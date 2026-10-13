import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  AddHabitModal: undefined;
  AddReflectionModal: undefined;
  AddNoteModal: undefined;
  AddTaskModal: { date?: string } | undefined;
  SettingsScreen: undefined;
};

export type MainTabParamList = {
  Today: undefined;
  Log: NavigatorScreenParams<LogStackParamList> | undefined;
  Journal: undefined;
  Plan: NavigatorScreenParams<PlanStackParamList> | undefined;
  Stats: undefined;
};

export type LogStackParamList = {
  LogHomeScreen: undefined;
  LogMealScreen: { logId?: string } | undefined;
  LogWorkoutScreen: undefined;
  WorkoutDetailScreen: { workoutId: string };
  LogSleepScreen: { sleepId?: string } | undefined;
  LogBodyScreen: { metricId?: string } | undefined;
};

export type PlanStackParamList = {
  PlanHomeScreen: undefined;
  EventDetailScreen: { eventId?: string } | undefined;
};

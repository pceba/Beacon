import { NavigatorScreenParams } from '@react-navigation/native';

export type LogStackParamList = {
  LogMealScreen: { logId?: string; fromToday?: boolean } | undefined;
  LogWorkoutScreen: { fromToday?: boolean } | undefined;
  WorkoutDetailScreen: { workoutId: string; fromToday?: boolean };
  LogSleepScreen: { sleepId?: string; fromToday?: boolean } | undefined;
  LogBodyScreen: { metricId?: string } | undefined;
};

export type PlanStackParamList = {
  PlanHomeScreen: undefined;
  EventDetailScreen: { eventId?: string } | undefined;
};

export type MainTabParamList = {
  Today: undefined;
  Plan: NavigatorScreenParams<PlanStackParamList> | undefined;
  Journal: undefined;
  Stats: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  AddHabitModal: undefined;
  AddReflectionModal: undefined;
  AddNoteModal: undefined;
  AddTaskModal: { date?: string } | undefined;
  SettingsScreen: undefined;
} & LogStackParamList;

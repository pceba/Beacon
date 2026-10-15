import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const run = (work: () => Promise<void>) => {
  if (Platform.OS === 'web') return;
  work().catch(() => undefined);
};

export const selection = () => run(() => Haptics.selectionAsync());

export const light = () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

export const soft = () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));

export const medium = () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

export const success = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

export const warning = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));

export const error = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
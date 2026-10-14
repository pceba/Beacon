import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const openToday = () => {
  if (!navigationRef.isReady()) return false;
  navigationRef.navigate('MainTabs', { screen: 'Today' });
  return true;
};

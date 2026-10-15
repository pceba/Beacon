import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';

type LogNavigation = {
  navigate: (screen: 'MainTabs', params?: { screen: 'Today' }) => void;
  canGoBack: () => boolean;
  goBack: () => void;
  addListener: (
    event: 'beforeRemove',
    callback: (event: { data: { action: { type: string } }; preventDefault: () => void }) => void,
  ) => () => void;
};

export const finishLog = (navigation: LogNavigation, fromToday?: boolean) => {
  if (fromToday) {
    navigation.navigate('MainTabs', { screen: 'Today' });
    return;
  }
  if (navigation.canGoBack()) navigation.goBack();
};

export const useReturnToToday = (fromToday?: boolean) => {
  const navigation = useNavigation() as LogNavigation;
  const leaving = useRef(false);

  useEffect(() => {
    if (!fromToday) return undefined;
    return navigation.addListener('beforeRemove', (event) => {
      const type = event.data.action.type;
      if (leaving.current) return;
      if (type !== 'GO_BACK' && type !== 'POP') return;
      event.preventDefault();
      leaving.current = true;
      finishLog(navigation, true);
    });
  }, [fromToday, navigation]);
};

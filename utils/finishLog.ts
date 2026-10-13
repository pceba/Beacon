import { useEffect, useRef } from 'react';
import { StackActions, useNavigation } from '@react-navigation/native';

type LogNavigation = {
  dispatch: (action: ReturnType<typeof StackActions.popToTop>) => void;
  getParent: () => { navigate: (screen: string) => void } | undefined;
  canGoBack: () => boolean;
  goBack: () => void;
};

export const finishLog = (navigation: LogNavigation, fromToday?: boolean) => {
  if (fromToday) {
    const parent = navigation.getParent();
    navigation.dispatch(StackActions.popToTop());
    setTimeout(() => parent?.navigate('Today'), 0);
    return;
  }
  if (navigation.canGoBack()) navigation.goBack();
};

export const useReturnToToday = (fromToday?: boolean) => {
  const navigation = useNavigation();
  const leaving = useRef(false);

  useEffect(() => {
    if (!fromToday) return undefined;
    return navigation.addListener('beforeRemove', (event) => {
      const type = event.data.action.type;
      if (leaving.current || type === 'POP_TO_TOP') return;
      if (type !== 'GO_BACK' && type !== 'POP') return;
      event.preventDefault();
      leaving.current = true;
      finishLog(navigation, true);
    });
  }, [fromToday, navigation]);
};

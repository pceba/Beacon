import { useCallback, useState } from 'react';
import { LayoutChangeEvent } from 'react-native';

export const useChartWidth = () => {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    setWidth((current) => (current === next ? current : next));
  }, []);
  return { width, onLayout };
};

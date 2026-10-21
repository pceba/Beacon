import { useRef } from 'react';
import { PanResponder } from 'react-native';

// Deslizar en horizontal: -1 hacia el periodo anterior, 1 hacia el siguiente.
// No roba los toques ni el desplazamiento vertical.
export const useSwipe = (onShift: (direction: -1 | 1) => void) => {
  const shift = useRef(onShift);
  shift.current = onShift;
  return useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 24 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -48) shift.current(1);
        else if (gesture.dx > 48) shift.current(-1);
      },
    }),
  ).current.panHandlers;
};

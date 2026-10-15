const listeners = new Set<() => void>();

export const refreshDay = () => {
  listeners.forEach((listener) => listener());
};

export const onDayRefresh = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

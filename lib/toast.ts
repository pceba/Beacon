import { error as hapticError } from './haptics';

type ToastKind = 'success' | 'error' | 'info';

export type ToastAction = { label: string; onPress: () => void };

export type ToastPayload = {
  message: string;
  kind?: ToastKind;
  action?: ToastAction;
};

type Listener = (item: ToastPayload) => void;

let listener: Listener | null = null;

export const registerToast = (next: Listener | null) => {
  listener = next;
};

export const toast = {
  show: (item: ToastPayload) => {
    if (item.kind === 'error') hapticError();
    listener?.(item);
  },
};

export const useToast = () => toast;

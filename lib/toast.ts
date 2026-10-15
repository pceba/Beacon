import { error as hapticError } from './haptics';

type ToastKind = 'success' | 'error' | 'info';

export type ToastAction = { label: string; onPress: () => void };

export type ToastPayload = {
  message: string;
  kind?: ToastKind;
  action?: ToastAction;
};

type Listener = (item: ToastPayload) => void;
type RouteListener = (name: string) => void;

let listener: Listener | null = null;
let routeListener: RouteListener | null = null;

export const registerToast = (next: Listener | null) => {
  listener = next;
};

export const notifyRoute = (name: string) => {
  routeListener?.(name);
};

export const registerRouteToast = (next: RouteListener | null) => {
  routeListener = next;
};

export const toast = {
  show: (item: ToastPayload) => {
    if (item.kind === 'error') hapticError();
    listener?.(item);
  },
};

export const useToast = () => toast;

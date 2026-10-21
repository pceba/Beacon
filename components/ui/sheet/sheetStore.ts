import type { ReactNode } from 'react';

// Registro de las hojas que pinta SheetHost. Cada <Sheet> publica aquí su contenido y
// su estado; cada capa del host se suscribe solo a la suya, así abrir una hoja no
// vuelve a pintar las demás ni la pantalla de debajo.

export type SheetEntry = {
  id: number;
  node: ReactNode;
  visible: boolean;
  onClose: () => void;
  keepMounted: boolean;
  fullHeight: boolean;
  label?: string;
};

type Listener = () => void;

const entries = new Map<number, SheetEntry>();
const entryListeners = new Map<number, Set<Listener>>();
const listListeners = new Set<Listener>();
let ids: number[] = [];
// Hojas abiertas, la última encima (para Atrás y Escape).
let openStack: number[] = [];
let nextId = 1;

const emitList = () => listListeners.forEach((listener) => listener());

export const sheetStore = {
  createId: () => nextId++,

  upsert(entry: SheetEntry) {
    const isNew = !entries.has(entry.id);
    entries.set(entry.id, entry);
    openStack = openStack.filter((id) => id !== entry.id);
    if (entry.visible) openStack.push(entry.id);
    if (isNew) {
      ids = [...ids, entry.id];
      emitList();
    }
    entryListeners.get(entry.id)?.forEach((listener) => listener());
  },

  remove(id: number) {
    if (!entries.delete(id)) return;
    ids = ids.filter((item) => item !== id);
    openStack = openStack.filter((item) => item !== id);
    emitList();
  },

  get: (id: number) => entries.get(id),
  ids: () => ids,
  // Orden de apilado: la hoja abierta más reciente queda encima.
  depth: (id: number) => openStack.indexOf(id) + 1,

  closeTop(): boolean {
    const top = openStack[openStack.length - 1];
    if (top == null) return false;
    entries.get(top)?.onClose();
    return true;
  },

  subscribeList(listener: Listener) {
    listListeners.add(listener);
    return () => {
      listListeners.delete(listener);
    };
  },

  subscribeEntry(id: number, listener: Listener) {
    const set = entryListeners.get(id) ?? new Set<Listener>();
    set.add(listener);
    entryListeners.set(id, set);
    return () => {
      set.delete(listener);
      if (set.size === 0) entryListeners.delete(id);
    };
  },
};

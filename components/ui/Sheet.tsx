import React, { useCallback, useLayoutEffect, useRef } from 'react';
import { sheetStore } from './sheet/sheetStore';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  // Mantiene el contenido montado aunque esté cerrada (la hoja Añadir): abrirla no pinta nada.
  keepMounted?: boolean;
  // Casi toda la pantalla; solo el asa arrastra.
  fullHeight?: boolean;
  label?: string;
};

// Hoja inferior. No pinta en su sitio: publica el contenido en SheetHost (DESIGN.md §9).
// El contenido se pinta fuera de la pantalla que la usa, así que no puede depender del
// contexto de esa pantalla (por ejemplo, useNavigation de un navegador anidado).
export const Sheet = ({ visible, onClose, children, keepMounted = false, fullHeight = false, label }: Props) => {
  const id = useRef(0);
  if (id.current === 0) id.current = sheetStore.createId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const close = useCallback(() => onCloseRef.current(), []);

  useLayoutEffect(() => {
    sheetStore.upsert({ id: id.current, node: children, visible, onClose: close, keepMounted, fullHeight, label });
  });

  useLayoutEffect(() => {
    const current = id.current;
    return () => sheetStore.remove(current);
  }, []);

  return null;
};

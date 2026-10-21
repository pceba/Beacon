// Cola de escrituras de una sesión: una detrás de otra, en el orden en que se hicieron
// los cambios. Si una falla se llama a su rollback y la cola sigue con la siguiente.

export type WriteQueue = {
  run: (task: () => Promise<void>, rollback?: () => void) => Promise<void>;
  // Se resuelve cuando no queda nada pendiente (también lo encolado mientras tanto).
  idle: () => Promise<void>;
  pending: () => number;
};

export const createWriteQueue = (onError: (error: unknown) => void, onIdle?: () => void): WriteQueue => {
  let tail: Promise<void> = Promise.resolve();
  let count = 0;

  const run = (task: () => Promise<void>, rollback?: () => void) => {
    count += 1;
    const next = tail
      .then(task)
      .catch((error: unknown) => {
        onError(error);
        rollback?.();
      })
      .finally(() => {
        count -= 1;
        if (count === 0) onIdle?.();
      });
    tail = next;
    return next;
  };

  const idle = async () => {
    let current: Promise<void>;
    do {
      current = tail;
      await current;
    } while (current !== tail);
  };

  return { run, idle, pending: () => count };
};

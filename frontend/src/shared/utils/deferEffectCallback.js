/** Starts effect work after the effect callback has returned. */
export function deferEffectCallback(callback) {
  let active = true;
  let cleanup;
  queueMicrotask(() => {
    if (!active) return;
    const result = callback();
    if (typeof result === 'function') cleanup = result;
  });
  return () => {
    active = false;
    cleanup?.();
  };
}

/** One recovery timer per canvas. Disposing a canvas must never fail its successor. */
export function watchWebGLContext(
  canvas: HTMLCanvasElement,
  callbacks: { lost: () => void; restored: () => void; expired: () => void },
  delay = 2500,
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  const active = () => !disposed && canvas.isConnected;
  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const lost = (event: Event) => {
    if (!active()) return;
    event.preventDefault();
    // Repeated events must not postpone recovery indefinitely.
    if (timer !== undefined) return;
    callbacks.lost();
    timer = setTimeout(() => {
      timer = undefined;
      if (active()) callbacks.expired();
    }, delay);
  };
  const restored = () => {
    if (!active()) return;
    cancel();
    callbacks.restored();
  };
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', restored);
  return () => {
    disposed = true;
    cancel();
    canvas.removeEventListener('webglcontextlost', lost);
    canvas.removeEventListener('webglcontextrestored', restored);
  };
}

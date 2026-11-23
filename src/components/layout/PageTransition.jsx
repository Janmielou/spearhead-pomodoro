import { useEffect, useRef } from 'react';
import { createMicroTileRenderer } from './microTileRenderer';

/**
 * Mosaic tile transition surface.
 * One canvas running the WebGL2 instanced mosaic renderer. The component
 * owns the renderer lifecycle for one transition instance:
 * created when covering starts, switched to reveal by phase, and
 * fully disposed when the transition ends or is cancelled.
 * If WebGL2 is unavailable, it reports that once and the caller
 * completes the navigation instantly.
 */
export default function PageTransition({
  transition,
  enabled = true,
  onCovered,
  onRevealed,
  onUnavailable,
}) {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const callbacksRef = useRef({ onCovered, onRevealed, onUnavailable });
  callbacksRef.current = { onCovered, onRevealed, onUnavailable };
  const unavailableSentRef = useRef(null);

  const transitionId = transition?.id ?? null;
  const phase = transition?.phase ?? 'idle';

  // Create and dispose the renderer once per transition instance.
  useEffect(() => {
    if (!transitionId || !enabled) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const renderer = createMicroTileRenderer(canvas, {
      onCovered: () => callbacksRef.current.onCovered(transitionId),
      onRevealDone: () => callbacksRef.current.onRevealed(transitionId),
    });
    if (!renderer) {
      if (unavailableSentRef.current !== transitionId) {
        unavailableSentRef.current = transitionId;
        callbacksRef.current.onUnavailable(transitionId);
      }
      return undefined;
    }
    rendererRef.current = renderer;

    const observer = new ResizeObserver(() => renderer.resize());
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    return () => {
      observer.disconnect();
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [transitionId, enabled]);

  // Begin the flip-away once the destination has rendered.
  useEffect(() => {
    if (phase === 'revealing') rendererRef.current?.startReveal();
  }, [phase, transitionId]);

  if (!transition || !enabled) return null;

  return (
    <div className="page-transition" aria-hidden="true">
      <canvas ref={canvasRef} className="page-transition__canvas" />
    </div>
  );
}

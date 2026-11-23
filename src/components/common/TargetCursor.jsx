import { useEffect, useRef } from 'react';

const INTERACTIVE_SELECTOR =
  'button, a[href], [role="button"], [role="tab"], [data-cursor-hover], .nav-item, input[type="checkbox"], input[type="radio"], input[type="button"], input[type="submit"], input[type="reset"]';
const TEXT_ENTRY_SELECTOR =
  'textarea, select, [contenteditable="true"], input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"])';
const BODY_CLASS = 'spearhead-cursor-on';

/**
 * Original animated targeting cursor.
 *
 * Two layers follow the pointer. The center reticle is positioned
 * directly from clientX and clientY so it never lags behind the
 * real pointer. A larger tracking ring eases toward it. Rotation,
 * scanning, and the center pulse are CSS animations, so they keep
 * moving while the pointer is still. Pointer tracking uses refs
 * and requestAnimationFrame only. There is no React state here.
 *
 * The native cursor is hidden inside the application while this
 * is active, including over text entry. Three contexts are used:
 * neutral tracking, interactive targeting (vermilion), and text
 * entry tracking (cyan, slightly smaller). Text fields keep their
 * blinking insertion caret, selection, and keyboard behavior.
 */
export default function TargetCursor({ enabled = true, animated = true }) {
  const rootRef = useRef(null);
  const centerRef = useRef(null);
  const trailRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const center = centerRef.current;
    const trail = trailRef.current;
    if (!enabled || !root || !center || !trail) return undefined;
    if (typeof window === 'undefined' || !window.matchMedia('(pointer: fine)').matches) {
      return undefined;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canAnimate = animated && !reducedMotion;
    root.classList.toggle('is-reduced', !canAnimate);
    document.body.classList.add(BODY_CLASS);

    const pointer = { x: -100, y: -100 };
    const trailing = { x: -100, y: -100 };
    let frame = null;
    let pulseTimer = null;
    let visible = false;

    const place = (node, x, y) => {
      node.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    };

    const runFrame = () => {
      place(center, pointer.x, pointer.y);
      if (canAnimate) {
        trailing.x += (pointer.x - trailing.x) * 0.2;
        trailing.y += (pointer.y - trailing.y) * 0.2;
      } else {
        trailing.x = pointer.x;
        trailing.y = pointer.y;
      }
      place(trail, trailing.x, trailing.y);
      const settled =
        Math.abs(pointer.x - trailing.x) < 0.1 && Math.abs(pointer.y - trailing.y) < 0.1;
      frame = visible && !settled ? window.requestAnimationFrame(runFrame) : null;
    };
    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(runFrame);
    };

    const hide = () => {
      visible = false;
      root.classList.add('is-hidden');
      root.classList.remove('is-targeting', 'is-text', 'is-pulsing');
      schedule();
    };

    const updateTarget = (target) => {
      if (!(target instanceof Element)) {
        root.classList.remove('is-targeting', 'is-text');
        return;
      }
      // Context C: text entry and form fields. The reticle stays
      // visible in its cyan state. It is never hidden here.
      if (target.closest(TEXT_ENTRY_SELECTOR)) {
        root.classList.add('is-text');
        root.classList.remove('is-targeting');
        return;
      }
      // Context B: interactive targeting. Context A is the default
      // when neither of the other two classes is present.
      root.classList.remove('is-text');
      const interactive = target.closest(INTERACTIVE_SELECTOR);
      const disabled =
        interactive &&
        (interactive.disabled === true || interactive.getAttribute('aria-disabled') === 'true');
      root.classList.toggle('is-targeting', Boolean(interactive && !disabled));
    };

    const onMove = (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (!visible) {
        trailing.x = pointer.x;
        trailing.y = pointer.y;
        visible = true;
      }
      root.classList.remove('is-hidden');
      updateTarget(event.target);
      schedule();
    };

    const onDown = (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      visible = true;
      root.classList.remove('is-hidden');
      updateTarget(event.target);
      if (root.classList.contains('is-targeting')) {
        root.classList.add('is-pulsing');
        if (pulseTimer) window.clearTimeout(pulseTimer);
        pulseTimer = window.setTimeout(() => root.classList.remove('is-pulsing'), 240);
      }
      schedule();
    };

    const onOut = (event) => {
      if (!event.relatedTarget) hide();
    };
    const onVisibility = () => {
      if (document.hidden) hide();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('mouseout', onOut);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', hide);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      document.removeEventListener('mouseout', onOut);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', hide);
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (pulseTimer) window.clearTimeout(pulseTimer);
      document.body.classList.remove(BODY_CLASS);
    };
  }, [enabled, animated]);

  if (!enabled) return null;

  return (
    <div ref={rootRef} className="target-cursor is-hidden" aria-hidden="true">
      <div ref={trailRef} className="target-cursor__trail">
        <div className="target-cursor__trail-scale">
          <svg viewBox="0 0 88 88" focusable="false">
            <g className="tc-spin-slow">
              <circle className="tc-trail-ring" cx="44" cy="44" r="35" />
              <circle className="tc-trail-marker" cx="44" cy="9" r="1.6" />
            </g>
            <circle className="tc-trail-dots" cx="44" cy="44" r="29" />
          </svg>
        </div>
      </div>

      <div ref={centerRef} className="target-cursor__center">
        <div className="target-cursor__scale">
          <svg viewBox="0 0 64 64" focusable="false">
            <g className="tc-spin">
              <circle className="tc-outer" cx="32" cy="32" r="27" />
              <circle className="tc-marker" cx="32" cy="5" r="1.4" />
              <circle className="tc-marker" cx="59" cy="32" r="1.4" />
              <circle className="tc-marker" cx="32" cy="59" r="1.4" />
              <circle className="tc-marker" cx="5" cy="32" r="1.4" />
              <path className="tc-ticks" d="M32 1v8M32 55v8M1 32h8M55 32h8" />
            </g>
            <g className="tc-spin-reverse">
              <circle className="tc-scan" cx="32" cy="32" r="21" />
            </g>
            <circle className="tc-inner" cx="32" cy="32" r="12" />
            <path className="tc-inner-ticks" d="M32 17v5M32 42v5M17 32h5M42 32h5" />
            <circle className="tc-dot" cx="32" cy="32" r="2.1" />
          </svg>
          <span className="target-cursor__pulse" />
        </div>
      </div>
    </div>
  );
}

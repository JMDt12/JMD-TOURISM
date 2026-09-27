import { useEffect } from 'react';

/**
 * A marigold ring that blooms wherever you tap, anywhere in the app.
 *
 * Mounted once from the layout and attached to the document, so it covers
 * every screen without each component knowing about it. The ripples live in
 * their own fixed, pointer-transparent layer, so they can never intercept a
 * click or shift the page. Skipped entirely for reduced-motion users.
 */
export default function useClickRipple() {
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return undefined;

    const layer = document.createElement('div');
    layer.className = 'ripple-layer';
    document.body.appendChild(layer);

    const onPointerDown = (e) => {
      // Ignore synthetic clicks with no real position (keyboard "click", etc).
      if (e.clientX === 0 && e.clientY === 0) return;
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.left = `${e.clientX}px`;
      ripple.style.top = `${e.clientY}px`;
      layer.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
      // Belt and braces: never let a stray node linger if the event misfires.
      setTimeout(() => ripple.remove(), 1200);
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      layer.remove();
    };
  }, []);
}

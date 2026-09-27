import { useEffect, useState } from 'react';
import { BRAND } from '../lib/brand.js';

/**
 * The arrival.
 *
 * A bus drives out of the distance straight at the viewer, headlights first,
 * then the curtain lifts on the site. It is decoration, so it never gets in
 * the way: it plays once per browser session (phones reload tabs constantly,
 * and it used to replay on every load), it lets every tap and swipe straight
 * through to the page (it used to block the screen for two seconds and
 * swallow the first tap - on iPhones that tap was simply lost), any touch or
 * key ends it early, and reduced motion skips it outright.
 */
const DURATION = 1200;
const SEEN_KEY = 'jmd.introSeen';

function shouldPlay() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return false;
  try {
    if (sessionStorage.getItem(SEEN_KEY)) return false;
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch { /* private mode: play it, it is harmless now */ }
  return true;
}

export default function BusIntro() {
  const [state, setState] = useState(() => (shouldPlay() ? 'running' : 'done'));

  useEffect(() => {
    if (state !== 'running') return undefined;
    const finish = () => setState('done');
    const timer = setTimeout(finish, DURATION);
    window.addEventListener('pointerdown', finish, { once: true });
    window.addEventListener('keydown', finish, { once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', finish);
      window.removeEventListener('keydown', finish);
    };
  }, [state]);

  if (state === 'done') return null;

  return (
    <div className="bus-intro" role="presentation" aria-hidden="true">
      <div className="bus-intro__road" />
      <div className="bus-intro__stage">
        <svg viewBox="0 0 260 200" className="bus-intro__bus" aria-hidden="true">
          {/* Head-on view: the bus grows out of the vanishing point. */}
          <ellipse cx="130" cy="186" rx="96" ry="10" fill="#1a1030" opacity="0.35" />
          <rect x="34" y="34" width="192" height="150" rx="20" fill="#2a1a5e" />
          <rect x="34" y="34" width="192" height="150" rx="20" fill="none" stroke="#e8930c" strokeWidth="3" />
          {/* Destination board */}
          <rect x="66" y="44" width="128" height="22" rx="6" fill="#0f0a24" />
          <text x="130" y="60" textAnchor="middle" fontSize="13" fontWeight="700" fill="#e8930c"
                fontFamily="ui-sans-serif, system-ui">MATHURA</text>
          {/* Windscreen */}
          <rect x="56" y="76" width="148" height="56" rx="10" fill="#cfe3f5" opacity="0.92" />
          <path d="M56 118 L204 92 L204 132 L56 132 Z" fill="#9dc3e6" opacity="0.45" />
          {/* Wipers */}
          <path d="M92 130 L112 96" stroke="#2a1a5e" strokeWidth="3" strokeLinecap="round" />
          <path d="M150 130 L170 96" stroke="#2a1a5e" strokeWidth="3" strokeLinecap="round" />
          {/* Grille and bumper */}
          <rect x="72" y="146" width="116" height="12" rx="4" fill="#1a1030" />
          <rect x="46" y="164" width="168" height="14" rx="6" fill="#c9c4d6" />
          {/* Headlights, which are the thing that reads as "coming at you" */}
          <circle className="bus-intro__lamp" cx="66" cy="152" r="13" fill="#fff3cf" />
          <circle className="bus-intro__lamp" cx="194" cy="152" r="13" fill="#fff3cf" />
          <circle cx="66" cy="152" r="6" fill="#fff" />
          <circle cx="194" cy="152" r="6" fill="#fff" />
        </svg>
        <div className="bus-intro__beam" />
      </div>

      <p className="bus-intro__word">
        <span className="bus-intro__brand">{BRAND.name}</span>
        <span className="bus-intro__sub">Mathura · your bus is on its way</span>
      </p>
    </div>
  );
}

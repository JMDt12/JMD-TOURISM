import { NavLink, useLocation } from 'react-router-dom';
import { useT } from '../context/LanguageContext.jsx';

/**
 * Phone navigation.
 *
 * Seven sections behind a hamburger is a lot of tapping, so the five people
 * actually reach for sit at the bottom where a thumb is. The rest stay in the
 * header menus. Hidden from large screens, where the full bar already fits.
 */
const TABS = [
  { to: '/', key: 'nav.home', end: true, icon: HomeIcon },
  { to: '/search', key: 'nav.buses', icon: BusIcon },
  { to: '/cars', key: 'nav.cars', icon: CarIcon },
  { to: '/stays', key: 'nav.stays', icon: BedIcon },
  { to: '/my-trips', key: 'nav.myTrips', icon: TicketIcon },
];

export default function BottomNav() {
  const t = useT();
  const { pathname } = useLocation();

  // Tapping the tab you are already on goes back to its top, as apps do.
  const toTop = (to) => () => {
    if (pathname === to) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav
      aria-label={t('nav.menu')}
      className="pad-safe-b fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg">
        {TABS.map(({ to, key, end, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              onClick={toTop(to)}
              className={({ isActive }) =>
                `flex h-[3.75rem] flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition ${
                  isActive ? 'text-indigo-brand' : 'text-ink-soft'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon active={isActive} />
                  <span className="max-w-full truncate px-0.5">{t(key)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* Simple line icons, drawn here so the bar costs no extra request. */
const base = (active) => ({
  width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: active ? 2.2 : 1.7,
  strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
});

function HomeIcon({ active }) {
  return (
    <svg {...base(active)}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M9.5 20v-5h5v5" />
    </svg>
  );
}

function BusIcon({ active }) {
  return (
    <svg {...base(active)}>
      <rect x="3.5" y="4" width="17" height="12.5" rx="2.5" />
      <path d="M3.5 11h17" />
      <path d="M7 16.5v2M17 16.5v2" />
      <circle cx="7.5" cy="14" r="0.6" fill="currentColor" />
      <circle cx="16.5" cy="14" r="0.6" fill="currentColor" />
    </svg>
  );
}

function CarIcon({ active }) {
  return (
    <svg {...base(active)}>
      <path d="M4 16v-2.2L6 9h12l2 4.8V16" />
      <path d="M3 16h18" />
      <circle cx="7.5" cy="17.5" r="1.6" />
      <circle cx="16.5" cy="17.5" r="1.6" />
    </svg>
  );
}

function BedIcon({ active }) {
  return (
    <svg {...base(active)}>
      <path d="M3 18v-7h13a4 4 0 0 1 4 4v3" />
      <path d="M3 14h17" />
      <path d="M3 8v10M21 18v-1" />
      <circle cx="7" cy="11.5" r="1.4" />
    </svg>
  );
}

function TicketIcon({ active }) {
  return (
    <svg {...base(active)}>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5v2a2 2 0 0 0 0 3.9v2A1.5 1.5 0 0 1 18.5 18h-13A1.5 1.5 0 0 1 4 16.4v-2a2 2 0 0 0 0-3.9Z" />
      <path d="M13 7v11" strokeDasharray="2 2" />
    </svg>
  );
}

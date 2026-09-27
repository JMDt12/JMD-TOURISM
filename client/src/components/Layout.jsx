import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import { BRAND, PHONES, CONTROL_ROOM, telLink, waLink } from '../lib/brand.js';
import { SourceBadge, IndiaFlag, Spinner } from './ui.jsx';
import BusIntro from './BusIntro.jsx';
import MoreMenu from './MoreMenu.jsx';
import BottomNav from './BottomNav.jsx';
import LanguagePicker from './LanguagePicker.jsx';
import { useT } from '../context/LanguageContext.jsx';
import { organizationJsonLd, safeJsonLd } from './Seo.jsx';
import useClickRipple from './useClickRipple.js';

export default function Layout() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const t = useT();
  useClickRipple();
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const nav = [
    { to: '/search', label: t('nav.buses') },
    { to: '/cars', label: t('nav.cars') },
    { to: '/bikes', label: t('nav.bikes') },
    { to: '/stays', label: t('nav.stays') },
    { to: '/packages', label: t('nav.tours') },
    { to: '/guides', label: t('nav.guides') },
    { to: '/my-trips', label: t('nav.myTrips') },
  ];

  const portalLink =
    user?.role === 'admin' ? { to: '/hq', label: 'HQ Control' }
    : user?.role === 'guide' ? { to: '/guide-portal', label: 'Guide Portal' }
    : user?.role === 'driver' ? { to: '/driver-portal', label: 'Driver Portal' }
    : null;

  return (
    <div className="has-tabbar flex min-h-dvh flex-col lg:pb-0">
      {/* The business itself, readable by a search engine on every page. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger -- JSON-LD has no other route
        dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationJsonLd()) }}
      />

      <ScrollToTop />
      <BusIntro />
      <LanguagePicker />

      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-indigo-brand text-[13px] font-black tracking-tight text-marigold transition group-hover:scale-105">
              {BRAND.glyph}
            </span>
            <span className="leading-tight">
              <span className="block font-display text-lg">{BRAND.name}</span>
              <span className="block text-[10px] font-semibold tracking-[0.12em] text-ink-soft uppercase">
                {t('common.since')}
              </span>
            </span>
          </Link>

          <nav className="ml-auto hidden items-center gap-0.5 lg:flex">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-indigo-100 text-indigo-brand' : 'hover:bg-paper-2'}`
                }
              >
                {n.label}
              </NavLink>
            ))}
            {portalLink && (
              <NavLink to={portalLink.to}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-peacock hover:bg-peacock-100">
                {portalLink.label}
              </NavLink>
            )}
            <a
              href={waLink(PHONES[0].dial, `Namaste ${BRAND.short}, I would like to ask about a trip.`)}
              target="_blank" rel="noreferrer"
              className="ml-1 rounded-lg border border-peacock/30 bg-peacock-100 px-2.5 py-2 text-sm font-semibold text-peacock transition hover:bg-peacock-100/70"
            >
              {t('nav.whatsappUs')}
            </a>
            {user ? (
              <button className="btn btn-ghost ml-1 py-1.5 text-sm" onClick={signOut}>
                {t('nav.signOut')}
              </button>
            ) : (
              <Link to="/login" className="btn btn-ink ml-1 py-1.5 text-sm">{t('nav.signIn')}</Link>
            )}
            <MoreMenu className="ml-1" />
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:hidden">
            <MoreMenu />
            <button
              className="btn btn-ghost px-3 py-1.5"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label={t('nav.menu')}
            >
              ☰
            </button>
          </div>
        </div>

        {open && (
          <nav className="border-t border-line bg-white px-4 py-2 lg:hidden">
            {[...nav, ...(portalLink ? [portalLink] : [])].map((n) => (
              <NavLink key={n.to} to={n.to}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-paper-2">
                {n.label}
              </NavLink>
            ))}
            <a href={waLink(PHONES[0].dial, `Namaste ${BRAND.short}, I would like to ask about a trip.`)}
               target="_blank" rel="noreferrer"
               className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-peacock">
              {t('nav.whatsappUs')}
            </a>
            {user ? (
              <button className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-paper-2"
                      onClick={signOut}>
                {t('nav.signOut')} ({user.name})
              </button>
            ) : (
              <Link to="/login" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-indigo-brand">
                {t('nav.signIn')}
              </Link>
            )}
          </nav>
        )}
        <div className="rule-braj" />
      </header>

      <main className="flex-1">
        {/* Lazy pages (HQ, portals, tracking) load inside the frame, so the
            header and tab bar stay put instead of the whole site blanking. */}
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </main>

      <SosButton />
      <Footer />
      <BottomNav />
    </div>
  );
}

/**
 * SOS is only offered while the traveller actually has a trip in motion.
 * It does not silently call anyone: it opens the real office numbers and
 * shows them, so the traveller stays in control of what happens.
 */
function SosButton() {
  const { user } = useAuth();
  const [active, setActive] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) { setActive(null); return; }
    let cancelled = false;
    const check = () =>
      api.get('/bookings')
        .then((d) => {
          if (cancelled) return;
          const live = d.upcoming.find((b) => b.trip?.status === 'ongoing' && b.confirmed);
          setActive(live ?? null);
        })
        .catch(() => {});
    check();
    const t = setInterval(check, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, [user]);

  if (!active) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-[calc(var(--tab-h)+var(--safe-b)+1rem)] z-50 flex items-center gap-2 rounded-full bg-sindoor px-4 py-3 text-sm font-bold text-white shadow-lg lg:bottom-4"
      >
        <span className="live-dot size-2 rounded-full bg-white" />
        SOS
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
             onClick={() => setOpen(false)}>
          <div className="card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl">Emergency help</h3>
            <p className="mt-1 text-sm text-ink-soft">
              You are on {active.trip.origin} to {active.trip.destination}, bus {active.trip.registrationNo}.
              Our Mathura control room is staffed for the whole journey.
            </p>
            <div className="mt-4 space-y-2">
              <a href={telLink(CONTROL_ROOM.dial)} className="btn btn-primary w-full">
                Call control room {CONTROL_ROOM.display}
              </a>
              <a href={telLink(active.trip.driverPhone)} className="btn btn-ghost w-full">
                Call driver {active.trip.driverName}
              </a>
              <a href={waLink(CONTROL_ROOM.dial, `SOS: booking ${active.reference}`)}
                 target="_blank" rel="noreferrer" className="btn btn-ghost w-full">
                WhatsApp control room
              </a>
            </div>
            <button className="mt-3 w-full text-sm text-ink-soft" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Footer() {
  const t = useT();
  return (
    <footer className="mt-12 border-t border-line bg-indigo-brand text-white/85">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-marigold text-[13px] font-black text-[#2a1500]">
              {BRAND.glyph}
            </span>
            <p className="font-display text-xl text-white">{BRAND.name}</p>
          </div>
          <p className="mt-3 text-sm">
            We are not a booking aggregator. The buses are ours, the drivers are on our payroll,
            and the guides are people we have verified in person.
          </p>
          <div className="mt-3"><SourceBadge /></div>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.12em] text-marigold uppercase">{t('common.headOffice')}</p>
          <address className="text-sm not-italic">{BRAND.address}</address>
          <ul className="mt-3 space-y-1.5 text-sm">
            {PHONES.map((p) => (
              <li key={p.dial}>
                <a className="font-medium underline" href={telLink(p.dial)}>{p.display}</a>
                {p.whatsapp && (
                  <>
                    {' · '}
                    <a className="text-marigold underline" target="_blank" rel="noreferrer"
                       href={waLink(p.dial, `Namaste ${BRAND.short}, I would like to ask about a trip.`)}>
                      WhatsApp
                    </a>
                  </>
                )}
                <span className="block text-xs text-white/60">{p.role}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.12em] text-marigold uppercase">Braj circuit</p>
          <ul className="space-y-1 text-sm">
            {[['Mathura', 'mathura'], ['Vrindavan', 'vrindavan'], ['Gokul', 'gokul'],
              ['Barsana', 'barsana'], ['Govardhan', 'govardhan']].map(([c, slug]) => (
              <li key={slug}>
                <Link className="hover:underline" to={`/destinations/${slug}`}>
                  Tourism services in {c}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.12em] text-marigold uppercase">Further afield</p>
          <ul className="space-y-1 text-sm">
            {[['Agra', 'agra'], ['Ayodhya', 'ayodhya'], ['Varanasi', 'varanasi'],
              ['Bharatpur', 'bharatpur']].map(([c, slug]) => (
              <li key={slug}>
                <Link className="hover:underline" to={`/destinations/${slug}`}>
                  Tours to {c}
                </Link>
              </li>
            ))}
            <li><Link className="hover:underline" to="/destinations">All destinations</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/15 px-4 py-4 text-xs text-white/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <p>
            © {new Date().getFullYear()} {BRAND.name}, Mathura. Licensed transport operator ·
            All India Tourist Permit buses.
          </p>

          {/* Builder credit, bottom right, with the country mark beneath it. */}
          <div className="flex flex-col items-center gap-1 sm:items-end">
            <a
              href="https://bajrangassociate.com/"
              target="_blank"
              rel="noreferrer"
              title="Bajrang Associate"
              className="font-semibold tracking-[0.16em] text-marigold uppercase transition hover:text-white hover:underline"
            >
              Powered by BA
            </a>
            <p className="flex items-center gap-1.5 tracking-[0.16em] whitespace-nowrap uppercase">
              Made in Bharat
              <IndiaFlag />
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

/**
 * A new page opens at its top. Without this, tapping a tab from the footer
 * changed the page but left the view on the footer - identical on every
 * page - so on a phone every tab looked dead.
 *
 * Back and forward return to where the reader was. The browser's own
 * restore fires before the page's data has arrived (the page is still
 * short), so positions are kept per history entry and re-applied once the
 * page is tall enough, for up to two seconds.
 */
const scrollPositions = new Map();

function ScrollToTop() {
  const location = useLocation();
  const type = useNavigationType();

  const current = useRef(location.key);

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    // Recorded as the reader scrolls: by the time a link has been followed,
    // the next page has already rendered and moved the position.
    let pending = 0;
    const onScroll = () => {
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        scrollPositions.set(current.current, window.scrollY);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const key = location.key;
    const target = type === 'POP' ? scrollPositions.get(key) ?? 0 : 0;
    current.current = null; // ignore scroll events caused by the jump itself
    let frame;
    const started = performance.now();
    const apply = () => {
      const reachable = document.documentElement.scrollHeight - window.innerHeight >= target;
      window.scrollTo(0, reachable ? target : document.documentElement.scrollHeight);
      if (!reachable && performance.now() - started < 2000) frame = requestAnimationFrame(apply);
      else current.current = key;
    };
    apply();
    return () => cancelAnimationFrame(frame);
  }, [location.key, type]);

  return null;
}

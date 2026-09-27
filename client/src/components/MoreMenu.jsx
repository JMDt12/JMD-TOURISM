import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext.jsx';
import LanguagePicker from './LanguagePicker.jsx';

/**
 * The three-dots menu: everything that matters but does not deserve a slot in
 * the main navigation. Language opens the same dialog a first-time visitor
 * sees, rather than a second, differently-behaved control.
 */
export default function MoreMenu({ className = '' }) {
  const { t, lang, languages } = useLang();
  const [open, setOpen] = useState(false);
  const [pickingLang, setPickingLang] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const items = [
    { to: '/profile', label: t('menu.profile'), icon: '👤' },
    { to: '/tracker', label: t('menu.tracker'), icon: '📍' },
    { to: '/contact', label: t('menu.contact'), icon: '☎' },
    { to: '/about', label: t('menu.about'), icon: 'ℹ' },
  ];

  const current = languages.find((l) => l.code === lang);

  return (
    <>
      <div className={`relative ${className}`} ref={wrapRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t('nav.more')}
          className="grid size-10 place-items-center rounded-lg border border-line bg-white text-lg leading-none transition hover:bg-paper-2"
        >
          <span aria-hidden="true">⋮</span>
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-white shadow-lg"
          >
            {items.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-paper-2"
              >
                <span aria-hidden="true" className="w-5 text-center text-ink-soft">{it.icon}</span>
                {it.label}
              </Link>
            ))}

            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); setPickingLang(true); }}
              className="flex w-full items-center gap-3 border-t border-line px-4 py-3 text-left text-sm font-medium hover:bg-paper-2"
            >
              <span aria-hidden="true" className="w-5 text-center text-ink-soft">🌐</span>
              <span className="flex-1">{t('menu.language')}</span>
              <span className="text-xs text-ink-soft">{current?.native}</span>
            </button>
          </div>
        )}
      </div>

      {pickingLang && <LanguagePicker force onClose={() => setPickingLang(false)} />}
    </>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useLang } from '../context/LanguageContext.jsx';
import { BRAND } from '../lib/brand.js';
import { lockScroll } from '../lib/scrollLock.js';

/**
 * The language choice.
 *
 * Shown once, on a visitor's first arrival, and never again — the choice is
 * remembered. The same dialog is reused from the menu when someone wants to
 * switch, which is why `force` exists.
 *
 * Twenty-three options is too many to scan, so English and Hindi lead (they
 * carry the full interface) and the rest are searchable underneath.
 */
export default function LanguagePicker({ force = false, onClose }) {
  const { lang, setLang, chosen, languages, t } = useLang();
  const open = force || !chosen;
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      // The first run has no dismissal: a choice has to be made. A later
      // visit from the menu can be escaped.
      if (e.key === 'Escape' && force) onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const release = lockScroll();
    return () => {
      document.removeEventListener('keydown', onKey);
      release();
    };
  }, [open, force, onClose]);

  const { lead, rest } = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const match = (l) =>
      !needle ||
      l.label.toLowerCase().includes(needle) ||
      l.native.toLowerCase().includes(needle) ||
      l.code.includes(needle);
    return {
      lead: languages.filter((l) => l.full && match(l)),
      rest: languages.filter((l) => !l.full && match(l)),
    };
  }, [languages, q]);

  if (!open) return null;

  const choose = (code) => {
    setLang(code);
    onClose?.();
  };

  const Option = ({ l }) => (
    <button
      onClick={() => choose(l.code)}
      aria-pressed={l.code === lang}
      dir={l.dir}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-left transition ${
        l.code === lang ? 'border-indigo-brand bg-indigo-100' : 'border-line bg-white hover:bg-paper-2'
      }`}
    >
      <span className="min-w-0">
        <span className="block truncate font-display text-lg">{l.native}</span>
        <span className="block truncate text-xs text-ink-soft">{l.label}</span>
      </span>
      {l.code === lang && <span className="text-indigo-brand" aria-hidden="true">✓</span>}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[9997] grid place-items-center bg-indigo-brand/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lang-title"
      onClick={force ? onClose : undefined}
    >
      <div
        className="card flex max-h-[88dvh] w-full max-w-sm flex-col p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-xl bg-indigo-brand text-[13px] font-black text-marigold">
            {BRAND.glyph}
          </span>
          <h2 id="lang-title" className="mt-3 font-display text-2xl">{t('lang.title')}</h2>
          <p className="mt-1 text-sm text-ink-soft">{t('lang.subtitle')}</p>
        </div>

        <input
          className="field mt-4 shrink-0"
          placeholder="Search / खोजें"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search languages"
        />

        <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {lead.map((l) => <Option key={l.code} l={l} />)}

          {!!rest.length && (
            <p className="pt-2 text-[10px] font-bold tracking-[0.12em] text-ink-soft uppercase">
              भारत की भाषाएँ · Languages of India
            </p>
          )}
          {rest.map((l) => <Option key={l.code} l={l} />)}

          {!lead.length && !rest.length && (
            <p className="py-6 text-center text-sm text-ink-soft">No language matches that.</p>
          )}
        </div>

        {force && (
          <button className="btn btn-ghost mt-4 shrink-0 py-1.5 text-sm" onClick={onClose}>
            {t('common.close')}
          </button>
        )}
      </div>
    </div>
  );
}

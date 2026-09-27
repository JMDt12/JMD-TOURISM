import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { dayInput } from '../lib/format.js';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const toDate = (iso) => new Date(`${iso}T00:00:00`);
const monthKey = (iso) => iso.slice(0, 7);
const addMonths = (iso, n) => {
  const d = toDate(iso);
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return dayInput(d);
};

/** Every day in the month containing `iso`, padded to whole weeks. */
function monthGrid(iso) {
  const first = toDate(iso);
  first.setDate(1);
  const lead = first.getDay();
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();

  const cells = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const d = new Date(first);
    d.setDate(day);
    cells.push(dayInput(d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * Month grid date picker.
 *
 * `availability` is an optional map of YYYY-MM-DD -> { free, total }. When it
 * is supplied, a day with no free vehicle is shown as unpickable rather than
 * letting someone choose it and find an empty results page. Without it the
 * calendar is a plain picker, which is what the package pages want.
 */
export function Calendar({ value, onChange, min, max, availability = null, onMonthChange }) {
  const [cursor, setCursor] = useState(() => value || min || dayInput());
  const gridRef = useRef(null);

  useEffect(() => {
    if (value && monthKey(value) !== monthKey(cursor)) setCursor(value);
    // Only follow an externally-changed value, not our own paging.
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { onMonthChange?.(cursor); }, [cursor, onMonthChange]);

  const cells = useMemo(() => monthGrid(cursor), [cursor]);
  const today = dayInput();

  const dayState = (iso) => {
    if (!iso) return { disabled: true };
    if (min && iso < min) return { disabled: true, reason: 'in the past' };
    if (max && iso > max) return { disabled: true, reason: 'beyond our published schedule' };
    if (availability) {
      const a = availability[iso];
      if (!a || a.free === 0) {
        return { disabled: true, free: 0, reason: a?.total ? 'fully chartered' : 'no service' };
      }
      return { disabled: false, free: a.free };
    }
    return { disabled: false };
  };

  // Arrow keys move a day at a time, up/down a week, so the grid behaves the
  // way a date picker is expected to.
  const onKeyDown = (e) => {
    const deltas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const delta = deltas[e.key];
    if (!delta) return;
    e.preventDefault();
    const from = e.target.dataset.iso ?? value ?? cursor;
    const d = toDate(from);
    d.setDate(d.getDate() + delta);
    const next = dayInput(d);
    if (min && next < min) return;
    if (max && next > max) return;
    if (monthKey(next) !== monthKey(cursor)) setCursor(next);
    requestAnimationFrame(() => {
      gridRef.current?.querySelector(`[data-iso="${next}"]`)?.focus();
    });
  };

  const canGoBack = !min || monthKey(addMonths(cursor, -1)) >= monthKey(min);
  const canGoForward = !max || monthKey(addMonths(cursor, 1)) <= monthKey(max);

  return (
    <div className="w-[min(92vw,20rem)]">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button" className="btn btn-ghost px-2.5 py-1 text-sm"
          onClick={() => setCursor(addMonths(cursor, -1))}
          disabled={!canGoBack} aria-label="Previous month"
        >
          ‹
        </button>
        <p className="font-display text-base" aria-live="polite">
          {MONTHS[toDate(cursor).getMonth()]} {toDate(cursor).getFullYear()}
        </p>
        <button
          type="button" className="btn btn-ghost px-2.5 py-1 text-sm"
          onClick={() => setCursor(addMonths(cursor, 1))}
          disabled={!canGoForward} aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-bold tracking-wide text-ink-soft uppercase">
        {WEEKDAYS.map((d, i) => <span key={i}>{d}</span>)}
      </div>

      <div ref={gridRef} className="mt-1 grid grid-cols-7 gap-1" onKeyDown={onKeyDown} role="grid">
        {cells.map((iso, i) => {
          if (!iso) return <span key={`pad-${i}`} />;
          const { disabled, free, reason } = dayState(iso);
          const selected = iso === value;
          const isToday = iso === today;
          const label = toDate(iso).toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long',
          });

          return (
            <button
              key={iso}
              type="button"
              data-iso={iso}
              disabled={disabled}
              aria-selected={selected}
              aria-label={
                disabled
                  ? `${label}, unavailable${reason ? `, ${reason}` : ''}`
                  : `${label}${free != null ? `, ${free} bus${free === 1 ? '' : 'es'} free` : ''}`
              }
              title={disabled && reason ? reason : undefined}
              onClick={() => onChange(iso)}
              className={[
                'relative grid h-10 place-items-center rounded-lg text-sm transition',
                selected && 'bg-indigo-brand font-bold text-white',
                !selected && !disabled && 'bg-white hover:bg-indigo-100',
                !selected && disabled && 'cursor-not-allowed text-ink-soft/35',
                !selected && isToday && !disabled && 'ring-1 ring-marigold',
              ].filter(Boolean).join(' ')}
            >
              <span className="leading-none">{toDate(iso).getDate()}</span>
              {availability && (
                <span
                  aria-hidden="true"
                  className={`absolute bottom-1 size-1.5 rounded-full ${
                    disabled ? 'bg-transparent'
                      : selected ? 'bg-marigold'
                      : free >= 3 ? 'bg-peacock' : 'bg-marigold'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {availability && (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-peacock" /> buses free
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-marigold" /> only one or two
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded border border-line" /> none free
          </span>
        </p>
      )}
    </div>
  );
}

/**
 * The calendar in a popover, behind a field-shaped button. Closes on outside
 * click, on Escape, and as soon as a date is chosen.
 */
export function DatePicker({
  value, onChange, min, max, availability = null, label = 'Date', id,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const autoId = useId();
  const fieldId = id ?? autoId;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pretty = value
    ? toDate(value).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    : 'Pick a date';

  return (
    <div className="relative" ref={wrapRef}>
      <label className="label" htmlFor={fieldId}>{label}</label>
      <button
        type="button"
        id={fieldId}
        className="field flex w-full items-center justify-between gap-2 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={value ? '' : 'text-ink-soft'}>{pretty}</span>
        <span aria-hidden="true" className="text-ink-soft">▾</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose a date"
          className="absolute right-0 z-50 mt-2 rounded-xl border border-line bg-white p-3 shadow-lg"
        >
          <Calendar
            value={value}
            min={min}
            max={max}
            availability={availability}
            onChange={(d) => { onChange(d); setOpen(false); }}
          />
        </div>
      )}
    </div>
  );
}

export default DatePicker;

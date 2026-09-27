import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SearchBar from '../components/SearchBar.jsx';
import { useApi } from '../lib/useApi.js';
import { qs } from '../lib/api.js';
import { Card, Badge, Spinner, Empty, ErrorNote, PhotoSlot } from '../components/ui.jsx';
import { time, dateShort, duration, busTypeLabel, dayInput, addDays } from '../lib/format.js';
import { useT } from '../context/LanguageContext.jsx';

const WINDOWS = [
  { code: 'morning', label: 'Morning', hint: '4am – 11am' },
  { code: 'afternoon', label: 'Afternoon', hint: '11am – 4pm' },
  { code: 'evening', label: 'Evening', hint: '4pm – 9pm' },
  { code: 'night', label: 'Night', hint: '9pm – 4am' },
];

const SORTS = [
  { code: 'departure', label: 'Departure' },
  { code: 'capacity_asc', label: 'Smallest that fits' },
  { code: 'capacity_desc', label: 'Largest first' },
  { code: 'duration', label: 'Fastest' },
];

export default function Search() {
  const t = useT();
  const [params] = useSearchParams();
  const from = params.get('from') || 'Delhi';
  const to = params.get('to') || 'Mathura';
  const date = params.get('date') || dayInput();
  const passengers = Number(params.get('passengers')) || 10;

  const [busType, setBusType] = useState([]);
  const [windows, setWindows] = useState([]);
  const [sort, setSort] = useState('departure');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const path = useMemo(
    () => `/trips/search${qs({ from, to, date, passengers, busType, departWindow: windows, sort })}`,
    [from, to, date, passengers, busType, windows, sort]
  );
  const { data, loading, error, reload } = useApi(path);

  const meta = data?.meta;
  const trips = data?.trips ?? [];
  const toggle = (setter) => (v) =>
    setter((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));

  const clearAll = () => { setBusType([]); setWindows([]); };
  const activeFilters = busType.length + windows.length;

  const Filters = (
    <div className="space-y-5">
      <div>
        <p className="label">{t('search.vehicleType')}</p>
        <div className="flex flex-wrap gap-2">
          {(meta?.busTypes ?? []).map((t) => (
            <Chip key={t} active={busType.includes(t)} onClick={() => toggle(setBusType)(t)}>
              {busTypeLabel(t)}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <p className="label">{t('search.departure')}</p>
        <div className="flex flex-wrap gap-2">
          {WINDOWS.map((w) => (
            <Chip key={w.code} active={windows.includes(w.code)} onClick={() => toggle(setWindows)(w.code)}>
              {w.label} <span className="opacity-60">{w.hint}</span>
            </Chip>
          ))}
        </div>
      </div>
      {activeFilters > 0 && (
        <button className="btn btn-ghost w-full py-1.5 text-sm" onClick={clearAll}>
          Clear {activeFilters} filter{activeFilters > 1 ? 's' : ''}
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <SearchBar initial={{ from, to, date, passengers }} compact />

      <DateStrip from={from} to={to} date={date} passengers={passengers} />

      <div className="mt-5 grid gap-6 lg:grid-cols-[250px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <button
            className="btn btn-ghost w-full justify-between lg:hidden"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
          >
            {t('search.filters')} {activeFilters > 0 && <Badge tone="warn">{activeFilters}</Badge>}
            <span aria-hidden="true">{filtersOpen ? '▲' : '▼'}</span>
          </button>
          <Card className={`mt-2 p-4 ${filtersOpen ? 'block' : 'hidden'} lg:mt-0 lg:block`}>
            {Filters}
          </Card>
        </aside>

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-soft">
              {loading
                ? t('search.searching')
                : `${trips.length} bus${trips.length === 1 ? '' : 'es'} free for your group of ${passengers} · ${from} to ${to} · ${dateShort(`${date}T00:00`)}`}
            </p>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-ink-soft" htmlFor="sort">{t('search.sort')}</label>
              <select id="sort" className="field w-auto py-1.5 text-sm" value={sort}
                      onChange={(e) => setSort(e.target.value)}>
                {SORTS.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {loading && <Spinner label="Finding buses" />}
          {error && <ErrorNote error={error} onRetry={reload} />}

          {!loading && !error && !trips.length && (
            <Empty
              title="No bus free for that group on this date"
              hint={
                activeFilters
                  ? 'Try clearing a filter, or look at the next day.'
                  : meta?.chartered
                    ? `Every bus we run on ${from} to ${to} that day is already chartered. Try another date.`
                    : `We do not run ${from} to ${to} on this date, or nothing we run seats ${passengers}. Try another date or a smaller group.`
              }
              action={
                activeFilters
                  ? <button className="btn btn-primary" onClick={clearAll}>Clear filters</button>
                  : <Link className="btn btn-primary" to="/packages">See our Braj package</Link>
              }
            />
          )}

          <div className="space-y-3">
            {trips.map((t) => <TripRow key={t.id} trip={t} passengers={passengers} />)}
          </div>

          {!loading && !!trips.length && meta?.chartered > 0 && (
            <p className="mt-4 text-center text-xs text-ink-soft">
              {meta.chartered} other departure{meta.chartered === 1 ? ' is' : 's are'} already
              chartered on this route today.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const Chip = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
      active ? 'border-indigo-brand bg-indigo-brand text-white' : 'border-line bg-white hover:bg-paper-2'
    }`}
  >
    {children}
  </button>
);

/** Seven days at a glance, so nobody has to open a date picker to shift a day. */
function DateStrip({ from, to, date, passengers }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(dayInput(), i));
  return (
    <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
      {days.map((d) => {
        const active = d === date;
        const dt = new Date(`${d}T00:00`);
        return (
          <Link
            key={d}
            to={`/search${qs({ from, to, date: d, passengers })}`}
            className={`shrink-0 rounded-xl border px-3 py-2 text-center text-xs ${
              active ? 'border-indigo-brand bg-indigo-brand text-white' : 'border-line bg-white hover:bg-paper-2'
            }`}
          >
            <span className="block font-semibold">{dt.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
            <span className={active ? 'text-white/80' : 'text-ink-soft'}>
              {dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function TripRow({ trip, passengers }) {
  const t = useT();
  const spare = trip.capacity - passengers;
  return (
    <Card className="overflow-hidden transition hover:border-indigo-brand/50 hover:shadow-sm">
      <div className="grid gap-4 p-4 sm:grid-cols-[110px_1fr_auto]">
        <PhotoSlot scene="bus" label="Bus photo" name={trip.bus.name} alt={trip.bus.name}
                   ratio="aspect-[4/3]" className="hidden sm:block" />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg">{trip.bus.name}</h3>
            <Badge tone="ink">{busTypeLabel(trip.bus.type)}</Badge>
            <Badge tone="verified">{trip.capacity} seats, all yours</Badge>
          </div>

          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-xl">{time(trip.departure)}</span>
            <span className="text-xs text-ink-soft">── {duration(trip.durationHrs)} ──</span>
            <span className="font-display text-xl">{time(trip.arrival)}</span>
            <span className="text-xs text-ink-soft">
              {trip.route.origin} → {trip.route.destination}
            </span>
          </div>

          <p className="mt-2 line-clamp-1 text-xs text-ink-soft">
            {trip.bus.amenities.slice(0, 4).join(' · ')}
            {trip.route.stops.length > 0 && ` · via ${trip.route.stops.map((s) => s.name).join(', ')}`}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Driver {trip.bus.driverName} · {trip.bus.registrationNo}
          </p>
        </div>

        <div className="flex flex-row items-end justify-between gap-3 sm:flex-col sm:items-end">
          <div className="text-right">
            <p className="font-display text-lg">{trip.capacity} seats</p>
            <p className="text-xs text-ink-soft">{t('search.yoursAlone')}</p>
            <p className={`mt-1 text-xs font-semibold ${spare >= 0 ? 'text-peacock' : 'text-sindoor'}`}>
              {spare > 0 ? `${spare} spare seat${spare === 1 ? '' : 's'}` : spare === 0 ? 'Exact fit' : 'Too small'}
            </p>
          </div>
          <Link to={`/trips/${trip.id}?passengers=${passengers}`} className="btn btn-primary whitespace-nowrap">
            {t('search.requestBus')}
          </Link>
        </div>
      </div>
    </Card>
  );
}

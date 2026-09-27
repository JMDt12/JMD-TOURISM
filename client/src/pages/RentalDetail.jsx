import { useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import { qs } from '../lib/api.js';
import { DatePicker } from '../components/Calendar.jsx';
import { Card, Badge, Spinner, ErrorNote, PhotoSlot, SourceBadge } from '../components/ui.jsx';
import { dayInput, dateLong } from '../lib/format.js';
import { KIND_COPY } from './Rentals.jsx';

const SPEC_LABEL = {
  seats: 'Seats', luggage: 'Luggage', transmission: 'Gearbox', fuel: 'Fuel', ac: 'AC',
  engine: 'Engine', mileage: 'Mileage', gears: 'Gears',
  occupancy: 'Sleeps', bed: 'Beds', size: 'Size', bathroom: 'Bathroom',
};

const addDaysIso = (iso, n) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

export default function RentalDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [from, setFrom] = useState(params.get('from') || dayInput());
  const [nights, setNights] = useState(2);
  const [units, setUnits] = useState(Number(params.get('units')) || 1);

  const to = useMemo(() => addDaysIso(from, Math.max(1, nights)), [from, nights]);
  const { data, loading, error, reload } = useApi(`/rentals/${id}${qs({ from, to })}`);
  const avail = useApi(`/rentals/${id}/availability${qs({ units, days: 60 })}`);

  const availability = useMemo(() => {
    if (!avail.data?.days) return null;
    return Object.fromEntries(avail.data.days.map((d) => [d.date, d]));
  }, [avail.data]);

  if (loading) return <Spinner label="Loading" />;
  if (error) return <div className="mx-auto max-w-2xl p-4"><ErrorNote error={error} onRetry={reload} /></div>;

  const r = data.rental;
  const copy = KIND_COPY[r.kind] ?? KIND_COPY.car;
  const isRoom = r.kind === 'room';
  const enough = r.available >= units;

  const request = () => {
    navigate('/book', {
      state: {
        rentalId: r.id, rental: r, travelDate: from, endDate: to, units,
        partySize: isRoom ? (r.specs.occupancy ?? 2) * units : units,
      },
    });
  };

  const nightWord = isRoom ? (nights === 1 ? 'night' : 'nights') : (nights === 1 ? 'day' : 'days');

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-32 lg:pb-6">
      <Link to={`/${r.kind === 'room' ? 'stays' : `${r.kind}s`}`}
            className="text-sm text-ink-soft hover:underline">
        ← All {copy.units}
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="ink">{r.city}</Badge>
            {r.withDriver && <Badge tone="verified">Driver included</Badge>}
          </div>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl">{r.name}</h1>
          {r.subtitle && <p className="mt-1 text-ink-soft">{r.subtitle}</p>}
          {r.area && <p className="text-sm text-ink-soft">{r.area}</p>}
        </div>
        <SourceBadge />
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <PhotoSlot scene={r.kind} label={copy.photoLabel} name={r.name} alt={r.name} ratio="aspect-[16/9]" />

          <Card className="p-5">
            <h2 className="font-display text-xl">The details</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              {copy.specOrder.filter((k) => r.specs[k]).map((k) => (
                <div key={k}>
                  <dt className="text-xs text-ink-soft">{SPEC_LABEL[k] ?? k}</dt>
                  <dd className="font-medium">{r.specs[k]}</dd>
                </div>
              ))}
              <div>
                <dt className="text-xs text-ink-soft">We have</dt>
                <dd className="font-medium">{r.quantity} in total</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-xl">What you get</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {r.features.map((f) => (
                <li key={f} className="flex gap-2"><span className="text-peacock">✓</span>{f}</li>
              ))}
            </ul>
          </Card>

          {r.kind === 'bike' && (
            <Card className="border-marigold/40 bg-marigold-100/50 p-5">
              <h2 className="font-display text-xl">Before you ride</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Bring a valid driving licence — we check it at pick-up, and we will not hand over a
                bike without one. Two helmets come with every booking and we expect both to be worn.
                Fuel is not included; take it back roughly as full as you got it.
              </p>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="font-display text-xl">Cancellation</h2>
            <ul className="mt-3 divide-y divide-line text-sm">
              {r.cancellationPolicy.map((p) => (
                <li key={p.window} className="flex justify-between gap-4 py-2.5">
                  <span className="text-ink-soft">{p.window}</span>
                  <span className="shrink-0 font-semibold">{p.terms}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <aside className="hidden lg:block">
          <Card className="sticky top-24 p-5">
            <RequestBox
              r={r} copy={copy} isRoom={isRoom} enough={enough}
              from={from} setFrom={setFrom} nights={nights} setNights={setNights}
              units={units} setUnits={setUnits} to={to} nightWord={nightWord}
              availability={availability} onRequest={request}
            />
          </Card>
        </aside>
      </div>

      <div className="action-bar pad-safe-b border-t border-line bg-white p-3 lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg">Request this {copy.unit}</p>
            <p className="truncate text-xs text-ink-soft">
              {nights} {nightWord} from {from} · {units} {units === 1 ? copy.unit : copy.units}
            </p>
          </div>
          <button className="btn btn-primary" disabled={!enough} onClick={request}>Request</button>
        </div>
      </div>
    </div>
  );
}

function RequestBox({
  r, copy, isRoom, enough, from, setFrom, nights, setNights,
  units, setUnits, to, nightWord, availability, onRequest,
}) {
  return (
    <>
      <h2 className="font-display text-lg">Request this {copy.unit}</h2>
      <p className="mt-1 text-sm text-ink-soft">
        We quote by hand, so tell us the dates and how many you need and the Mathura office
        comes back to you.
      </p>

      <div className="mt-4 space-y-3">
        <DatePicker
          id="rd-from" label={copy.startLabel} value={from} onChange={setFrom}
          min={dayInput()} availability={availability}
        />
        <div>
          <label className="label" htmlFor="rd-nights">{copy.rangeLabel}</label>
          <select id="rd-nights" className="field" value={nights}
                  onChange={(e) => setNights(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7, 10, 14].map((n) => (
              <option key={n} value={n}>{n} {isRoom ? (n === 1 ? 'night' : 'nights') : (n === 1 ? 'day' : 'days')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="rd-units">How many {copy.units}?</label>
          <select id="rd-units" className="field" value={units}
                  onChange={(e) => setUnits(Number(e.target.value))}>
            {Array.from({ length: Math.min(10, r.quantity) }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-4 border-t border-line pt-3 text-sm">
        {isRoom ? 'Check in' : 'Pick up'} {dateLong(`${from}T00:00`)}
        <span className="block text-ink-soft">
          {isRoom ? 'Check out' : 'Return'} {dateLong(`${to}T00:00`)} · {nights} {nightWord}
        </span>
      </p>

      {!enough && (
        <p className="mt-2 text-xs text-sindoor">
          Only {r.available} free on those dates. Shift the date, ask for fewer, or call the office.
        </p>
      )}

      <button className="btn btn-primary mt-4 w-full" disabled={!enough} onClick={onRequest}>
        {enough ? 'Continue to details' : 'Not enough free on these dates'}
      </button>
      <p className="mt-2 text-center text-xs text-ink-soft">
        No payment now. Nothing is held until you accept our quote.
      </p>
    </>
  );
}

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import { qs } from '../lib/api.js';
import { DatePicker } from '../components/Calendar.jsx';
import { Card, Badge, Spinner, ErrorNote, Empty, PhotoSlot } from '../components/ui.jsx';
import { dayInput } from '../lib/format.js';
import Seo from '../components/Seo.jsx';

/**
 * Cars, bikes and rooms share this screen. They are the same shape — a unit
 * you take for a date range from a city — so the only thing that changes is
 * the wording and which spec lines are worth showing.
 */
export const KIND_COPY = {
  car: {
    title: 'Cars with a driver',
    eyebrow: 'Our own cars, our own drivers',
    blurb:
      'For a temple round, an Agra day trip or an airport run, when a whole bus is more than you need. Every car comes with one of our drivers — we do not do self-drive, because the roads around Braj are not the place to learn them.',
    unit: 'car', units: 'cars', photoLabel: 'Car photo',
    seoTitle: 'Car hire with driver in Mathura, Vrindavan and Agra',
    seoDescription:
      'Sedans, MPVs and a 13-seat van, each with one of our own drivers, for temple rounds, the Agra day trip and station runs. A licensed Vrindavan operator with All India Permit vehicles.',
    seoKeywords: 'car hire Mathura, taxi Vrindavan, cab booking Agra, Innova hire Mathura, car with driver Braj',
    path: '/cars',
    startLabel: 'Pick-up date', rangeLabel: 'How many days?',
    specOrder: ['seats', 'luggage', 'transmission', 'fuel', 'ac'],
    countLabel: (n) => `${n} in the yard`,
  },
  bike: {
    title: 'Bikes and scooters',
    eyebrow: 'Self-ride, helmets included',
    blurb:
      'The honest way round Vrindavan, where half the good lanes are too narrow for a car. Self-ride, two helmets with every booking, and a valid licence required at pick-up.',
    unit: 'bike', units: 'bikes', photoLabel: 'Bike photo',
    seoTitle: 'Bike and scooter rental in Vrindavan, Mathura and Agra',
    seoDescription:
      'Activa, Jupiter, Splendor and Royal Enfield hire for getting round the Braj lanes on your own. Two helmets with every booking, valid licence required at pick-up.',
    seoKeywords: 'bike rental Vrindavan, scooter hire Mathura, Activa rent Vrindavan, two wheeler rental Agra',
    path: '/bikes',
    startLabel: 'Pick-up date', rangeLabel: 'How many days?',
    specOrder: ['engine', 'mileage', 'gears', 'seats'],
    countLabel: (n) => `${n} available`,
  },
  room: {
    title: 'Rooms and stays',
    eyebrow: 'Beds we have slept in ourselves',
    blurb:
      'Rooms in Mathura, Vrindavan, Govardhan and Agra — including a dormitory built for large yatra groups. Walking distance to the temples that matter, and an early breakfast when your day starts at 04:30.',
    unit: 'room', units: 'rooms', photoLabel: 'Room photo',
    seoTitle: 'Rooms and stays in Mathura, Vrindavan, Govardhan and Agra',
    seoDescription:
      'Rooms walking distance from the temples, plus a 24-bed dormitory built for yatra groups. Mathura, Vrindavan, Govardhan and Taj Ganj in Agra, with early breakfasts for 04:30 starts.',
    seoKeywords: 'hotel Vrindavan near Prem Mandir, rooms Mathura, dharamshala Govardhan, stay Taj Ganj Agra',
    path: '/stays',
    startLabel: 'Check-in', rangeLabel: 'How many nights?',
    specOrder: ['occupancy', 'bed', 'size', 'bathroom'],
    countLabel: (n) => `${n} of these`,
  },
};

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

export default function Rentals({ kind = 'car' }) {
  const copy = KIND_COPY[kind] ?? KIND_COPY.car;

  const [city, setCity] = useState('');
  const [from, setFrom] = useState(dayInput());
  const [nights, setNights] = useState(kind === 'room' ? 2 : 1);
  const [units, setUnits] = useState(1);

  const to = useMemo(() => addDaysIso(from, Math.max(1, nights)), [from, nights]);
  const path = useMemo(
    () => `/rentals${qs({ kind, city, from, to, units })}`,
    [kind, city, from, to, units]
  );
  const { data, loading, error, reload } = useApi(path);

  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Seo
        title={copy.seoTitle}
        description={copy.seoDescription}
        path={copy.path}
        keywords={copy.seoKeywords}
      />
      <header className="max-w-2xl">
        <p className="text-[11px] font-bold tracking-[0.14em] text-marigold-dark uppercase">
          {copy.eyebrow}
        </p>
        <h1 className="mt-2 font-display text-3xl">{copy.title}</h1>
        <p className="mt-2 text-ink-soft">{copy.blurb}</p>
      </header>

      <Card className="mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor="r-city">City</label>
          <select id="r-city" className="field" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">Anywhere we operate</option>
            {(meta?.cities ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <DatePicker id="r-from" label={copy.startLabel} value={from} onChange={setFrom} min={dayInput()} />
        <div>
          <label className="label" htmlFor="r-nights">{copy.rangeLabel}</label>
          <select id="r-nights" className="field" value={nights}
                  onChange={(e) => setNights(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7, 10, 14].map((n) => (
              <option key={n} value={n}>{n} {kind === 'room' ? (n === 1 ? 'night' : 'nights') : (n === 1 ? 'day' : 'days')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="r-units">How many?</label>
          <select id="r-units" className="field" value={units}
                  onChange={(e) => setUnits(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
              <option key={n} value={n}>{n} {n === 1 ? copy.unit : copy.units}</option>
            ))}
          </select>
        </div>
      </Card>

      {loading && <Spinner label={`Checking what is free`} />}
      {error && <div className="mt-4"><ErrorNote error={error} onRetry={reload} /></div>}

      {!loading && !error && !items.length && (
        <div className="mt-6">
          <Empty
            title={`Nothing free on those dates`}
            hint={
              meta?.unavailable
                ? `All ${meta.unavailable} of our ${copy.units} in this area are out on those dates. Try shifting a day, or ask the office — we can often move things around.`
                : `We do not have ${copy.units} in that city yet. Try another, or ask the office.`
            }
            action={<Link to="/search" className="btn btn-primary">Look at buses instead</Link>}
          />
        </div>
      )}

      {!loading && !!items.length && (
        <p className="mt-5 text-sm text-ink-soft">
          {items.length} {items.length === 1 ? copy.unit : copy.units} free from {from} for{' '}
          {nights} {kind === 'room' ? (nights === 1 ? 'night' : 'nights') : (nights === 1 ? 'day' : 'days')}
        </p>
      )}

      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((r) => (
          <Card key={r.id} className="flex flex-col overflow-hidden transition hover:shadow-md">
            <PhotoSlot scene={r.kind} label={copy.photoLabel} name={r.name} alt={r.name}
                       ratio="aspect-[16/10]" className="rounded-b-none" />
            <div className="flex flex-1 flex-col p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="ink">{r.city}</Badge>
                {r.withDriver && <Badge tone="verified">Driver included</Badge>}
                <Badge tone={r.available > 2 ? 'verified' : 'warn'}>
                  {copy.countLabel(r.available)}
                </Badge>
              </div>
              <h2 className="mt-2 font-display text-lg leading-snug">{r.name}</h2>
              {r.subtitle && <p className="text-sm text-ink-soft">{r.subtitle}</p>}
              {r.area && <p className="mt-1 text-xs text-ink-soft">{r.area}</p>}

              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {copy.specOrder.filter((k) => r.specs[k]).map((k) => (
                  <div key={k}>
                    <dt className="text-ink-soft">{SPEC_LABEL[k] ?? k}</dt>
                    <dd className="font-medium">{r.specs[k]}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-auto pt-4">
                <Link
                  to={`/hire/${r.id}${qs({ from, to, units })}`}
                  className="btn btn-primary w-full py-1.5 text-sm"
                >
                  See details and request
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

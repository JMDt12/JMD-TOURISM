import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import { Card, Badge, Spinner, ErrorNote, Empty, PhotoSlot } from '../components/ui.jsx';
import Seo from '../components/Seo.jsx';

const TYPES = [
  { code: '', label: 'All' },
  { code: 'religious', label: 'Braj darshan' },
  { code: 'heritage', label: 'Heritage' },
  { code: 'hill_station', label: 'Hill stations' },
  { code: 'custom', label: 'Base camp' },
];

export default function Packages() {
  const [type, setType] = useState('');
  const { data, loading, error, reload } = useApi('/catalog/packages');
  const all = useMemo(() => data?.packages ?? [], [data]);
  const packages = type ? all.filter((p) => p.type === type) : all;
  // With a single trip on offer, category chips are just noise.
  const showFilters = new Set(all.map((p) => p.type)).size > 1;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Seo
        title="Braj darshan and Agra tour packages from Mathura"
        description="Two tours run end to end by us: the complete Braj darshan over five days from one Mathura hotel, and the four-day circuit pairing Krishna's towns with Agra and Fatehpur Sikri."
        path="/packages"
        keywords="Braj darshan package, Mathura Vrindavan tour package, Agra tour from Mathura, Govardhan parikrama tour"
      />
      <header className="max-w-2xl">
        <p className="text-[11px] font-bold tracking-[0.14em] text-marigold-dark uppercase">
          Run by us, start to finish
        </p>
        <h1 className="mt-2 font-display text-3xl">Our tours</h1>
        <p className="mt-2 text-ink-soft">
          Two tours, both run end to end by us: the whole Braj mandal from a single Mathura hotel,
          and the circuit that pairs Krishna's towns with the Mughal capitals at Agra and Fatehpur
          Sikri. Our own coach, our own guide — nothing subcontracted to a stranger you would meet
          for the first time at the pickup point.
        </p>
      </header>

      <div className={`mt-6 flex-wrap gap-2 ${showFilters ? 'flex' : 'hidden'}`}>
        {TYPES.map((t) => (
          <button
            key={t.code}
            onClick={() => setType(t.code)}
            aria-pressed={type === t.code}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
              type === t.code ? 'border-indigo-brand bg-indigo-brand text-white' : 'border-line bg-white hover:bg-paper-2'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <Spinner label="Loading packages" />}
      {error && <div className="mt-4"><ErrorNote error={error} onRetry={reload} /></div>}
      {!loading && !packages.length && <div className="mt-6"><Empty title="Nothing in this category yet" /></div>}

      <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((p) => (
          <Card key={p.slug} className="flex flex-col overflow-hidden transition hover:shadow-md">
            <PhotoSlot scene={p.slug.includes('agra') ? 'taj' : 'temple'} label="Tour photo"
                       name={p.title} alt={p.title}
                       ratio="aspect-[16/9]" className="rounded-b-none" />
            <div className="flex flex-1 flex-col p-4">
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="ink">{p.durationDays} day{p.durationDays > 1 ? 's' : ''}</Badge>
                {p.baseCamp && <Badge tone="warn">Base: {p.baseCamp}</Badge>}
              </div>
              <h2 className="mt-2 font-display text-lg leading-snug">{p.title}</h2>
              <p className="mt-1 line-clamp-3 text-sm text-ink-soft">{p.summary}</p>
              <ul className="mt-3 space-y-0.5 text-xs text-ink-soft">
                {p.inclusions.slice(0, 3).map((i) => (
                  <li key={i} className="flex gap-1.5"><span className="text-peacock">✓</span>{i}</li>
                ))}
              </ul>
              <div className="mt-auto flex items-end justify-end pt-4">
                <Link to={`/packages/${p.slug}`} className="btn btn-primary py-1.5 text-sm">
                  See itinerary
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

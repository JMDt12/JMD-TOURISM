import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import MiniMap from '../components/MiniMap.jsx';
import { Card, Badge, Spinner, ErrorNote, PhotoSlot, SourceBadge } from '../components/ui.jsx';
import { dayInput, dateLong } from '../lib/format.js';
import { PLACES, toPoints } from '../lib/places.js';
import { DatePicker } from '../components/Calendar.jsx';
import { TempleList } from '../components/TripPlan.jsx';


export default function PackageDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi(`/catalog/packages/${slug}`);
  const [travellers, setTravellers] = useState(2);
  const [date, setDate] = useState(dayInput());

  if (loading) return <Spinner label="Loading package" />;
  if (error) return <div className="mx-auto max-w-2xl p-4"><ErrorNote error={error} onRetry={reload} /></div>;

  const p = data.package;
  // A base camp package returns to the same town every night; that is the
  // whole pitch, so it gets its own treatment rather than a linear timeline.
  const isBaseCamp = Boolean(p.baseCamp) && p.itinerary.length > 2;

  const book = () => navigate('/book', {
    state: { packageId: p.id, package: p, travellers, travelDate: date },
  });

  // Stops in itinerary order, de-duplicated, so the drawn line follows the drive.
  const mapPoints = toPoints([
    ...new Set([p.baseCamp, ...p.itinerary.flatMap((d) => d.stops ?? [])].filter(Boolean)),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-28 lg:pb-8">
      <Link to="/packages" className="text-sm text-ink-soft hover:underline">← All packages</Link>

      <header className="mt-3 grid gap-5 sm:grid-cols-[1fr_260px]">
        <div>
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="ink">{p.durationDays} day{p.durationDays > 1 ? 's' : ''}</Badge>
            {p.baseCamp && <Badge tone="warn">Base camp: {p.baseCamp}</Badge>}
          </div>
          <h1 className="mt-2 font-display text-3xl">{p.title}</h1>
          <p className="mt-2 text-ink-soft">{p.summary}</p>
          <div className="mt-3"><SourceBadge /></div>
        </div>
        <PhotoSlot scene={p.slug.includes('agra') ? 'taj' : 'temple'} label="Tour photo"
                   name={p.title} alt={p.title} ratio="aspect-[4/3]" />
      </header>

      {isBaseCamp && <BaseCampPanel pkg={p} />}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section>
            <h2 className="font-display text-xl">Day by day</h2>
            <ol className="mt-3 space-y-3">
              {p.itinerary.map((d) => (
                <li key={d.day} className="flex gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-indigo-brand text-xs font-bold text-marigold">
                    D{d.day}
                  </span>
                  <Card className="flex-1 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{d.title}</p>
                      {(d.stops ?? []).map((st) => <Badge key={st} tone="warn">{st}</Badge>)}
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{d.detail}</p>
                    {!!d.temples?.length && (
                      <>
                        <p className="label mt-3 mb-1">Temples and sites on this day</p>
                        <TempleList temples={d.temples} className="mt-0" />
                      </>
                    )}
                  </Card>
                </li>
              ))}
            </ol>
          </section>

          {mapPoints.length > 1 && (
            <section>
              <h2 className="font-display text-xl">Where you go</h2>
              <div className="mt-3">
                {/* A base camp trip is spokes from one town, not a line. */}
                <MiniMap
                  path={mapPoints}
                  hub={p.baseCamp && PLACES[p.baseCamp] ? { name: p.baseCamp, ...PLACES[p.baseCamp] } : null}
                  height={240}
                />
              </div>
            </section>
          )}

          <section className="grid gap-4 sm:grid-cols-2">
            <Card className="p-4">
              <h3 className="font-display text-lg">Included</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {p.inclusions.map((i) => (
                  <li key={i} className="flex gap-2"><span className="text-peacock">✓</span>{i}</li>
                ))}
              </ul>
            </Card>
            <Card className="p-4">
              <h3 className="font-display text-lg">Not included</h3>
              <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                {p.exclusions.map((i) => (
                  <li key={i} className="flex gap-2"><span className="text-sindoor">×</span>{i}</li>
                ))}
              </ul>
            </Card>
          </section>
        </div>

        <aside className="hidden lg:block">
          <Card className="sticky top-24 p-5">
            <BookBox
              p={p} travellers={travellers} setTravellers={setTravellers}
              date={date} setDate={setDate} onBook={book}
            />
          </Card>
        </aside>
      </div>

      <div className="action-bar pad-safe-b border-t border-line bg-white p-3 lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="flex-1">
            <p className="font-display text-lg">Request this trip</p>
            <p className="text-xs text-ink-soft">{travellers} traveller{travellers > 1 ? 's' : ''}</p>
          </div>
          <select aria-label="Travellers" className="field w-20" value={travellers}
                  onChange={(e) => setTravellers(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <button className="btn btn-primary" onClick={book}>Request</button>
        </div>
      </div>
    </div>
  );
}

function BookBox({ travellers, setTravellers, date, setDate, onBook }) {
  return (
    <>
      <p className="font-display text-xl">Request this trip</p>
      <p className="mt-1 text-sm text-ink-soft">
        We quote every trip by hand, so tell us your dates and group and the Mathura office
        will come back with a price.
      </p>

      <div className="mt-4 space-y-3">
        <DatePicker id="pd-date" label="Start date" value={date} onChange={setDate} min={dayInput()} />
        <div>
          <label className="label" htmlFor="pd-trav">Travellers</label>
          <select id="pd-trav" className="field" value={travellers}
                  onChange={(e) => setTravellers(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <button className="btn btn-primary mt-4 w-full" onClick={onBook}>Request this trip</button>
      <p className="mt-2 text-center text-xs text-ink-soft">
        Starts {dateLong(`${date}T00:00`)}. Add a guide and meals on the next step.
      </p>
    </>
  );
}

/** Hub-and-spoke view: one bed, day-trips radiating out and back. */
function BaseCampPanel({ pkg }) {
  const days = pkg.itinerary;
  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-line bg-linear-to-br from-peacock-100 to-paper-2 p-5 sm:p-7">
      <p className="text-[11px] font-bold tracking-[0.14em] text-peacock uppercase">Base camp trip</p>
      <h2 className="mt-1 font-display text-2xl">
        {pkg.baseCamp} is your base. You unpack once.
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Each day is a loop: out in the morning, back to the same room at night. No repacking, no
        hotel roulette, and your guide already knows your group by day two.
      </p>

      <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-stretch">
        <div className="grid w-full shrink-0 place-items-center rounded-xl border-2 border-indigo-brand bg-white p-5 text-center sm:w-48">
          <div>
            <span className="text-[10px] font-bold tracking-[0.12em] text-ink-soft uppercase">Base</span>
            <p className="font-display text-2xl">{pkg.baseCamp}</p>
            <p className="text-xs text-ink-soft">{pkg.durationDays - 1} nights, one bed</p>
          </div>
        </div>

        <div className="grid flex-1 gap-2 sm:grid-cols-2">
          {days.map((d) => (
            <div key={d.day} className="flex items-center gap-3 rounded-xl border border-line bg-white/85 p-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-marigold text-xs font-bold text-[#2a1500]">
                D{d.day}
              </span>
              <span className="min-w-0 text-sm">
                <span className="block truncate font-medium">{d.title}</span>
                <span className="block truncate text-xs text-ink-soft">
                  {(d.stops ?? []).join(' · ') || pkg.baseCamp}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

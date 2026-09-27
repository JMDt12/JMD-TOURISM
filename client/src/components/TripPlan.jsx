import { Link } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import MiniMap from './MiniMap.jsx';
import { Card, Badge, SectionHead } from '../components/ui.jsx';
import { PLACES, toPoints, routeKm } from '../lib/places.js';

/**
 * A tour laid out day by day, with its map.
 *
 * Reads the real package rather than hardcoding the itinerary, so the plan on
 * the homepage and the plan you request cannot drift apart. Pass `hub` for a
 * base-camp trip (spokes out and back from one town) and leave it off for a
 * circuit (a line through the stops in order).
 */
export default function TripPlan({ slug, eyebrow, title, towns, hub = null }) {
  const { data, loading } = useApi(`/catalog/packages/${slug}`);
  const p = data?.package;

  if (loading) {
    return <div className="card h-64 animate-pulse bg-paper-2" aria-hidden="true" />;
  }
  if (!p) return null;

  const templeCount = p.itinerary.reduce((n, d) => n + (d.temples?.length ?? 0), 0);
  const km = hub ? null : routeKm(towns);

  return (
    <section>
      <SectionHead
        eyebrow={eyebrow}
        title={title}
        action={
          <Link to={`/packages/${p.slug}`} className="text-sm font-semibold text-indigo-brand underline">
            Full details
          </Link>
        }
      />

      <Card className="overflow-hidden shadow-sm transition hover:shadow-md">
        <MiniMap
          path={toPoints(towns)}
          hub={hub && PLACES[hub] ? { name: hub, ...PLACES[hub] } : null}
          height={260}
          className="rounded-none border-0"
        />

        <div className="grid gap-4 border-b border-line bg-paper-2/60 p-5 sm:grid-cols-4">
          <Fact
            label="Duration"
            value={`${p.durationDays} days`}
            sub={hub ? `${p.durationDays - 1} nights, one hotel` : `${p.durationDays - 1} nights`}
          />
          <Fact label="Sites" value={templeCount} sub="named, not 'and others'" />
          <Fact
            label={hub ? 'Towns' : 'Circuit'}
            value={hub ? towns.length : `${km} km`}
            sub={towns.join(' · ')}
          />
          <Fact label="Vehicle" value="Yours alone" sub="whole coach, never shared" />
        </div>

        <div className="p-5">
          <p className="max-w-3xl text-ink-soft">{p.summary}</p>

          <ol className="mt-6 space-y-3">
            {p.itinerary.map((d) => (
              <li key={d.day} className="flex gap-3 sm:gap-4">
                <div className="flex flex-col items-center">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-brand text-xs font-bold text-marigold">
                    Day {d.day}
                  </span>
                  {d.day < p.itinerary.length && <span className="mt-1 w-px flex-1 bg-line" />}
                </div>
                <div className="min-w-0 flex-1 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg leading-snug">{d.title}</h3>
                    {(d.stops ?? []).map((s) => <Badge key={s} tone="warn">{s}</Badge>)}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{d.detail}</p>
                  <TempleList temples={d.temples} />
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="label">What is included</p>
              <ul className="space-y-1 text-sm">
                {p.inclusions.map((i) => (
                  <li key={i} className="flex gap-2"><span className="text-peacock">✓</span>{i}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="label">What is not</p>
              <ul className="space-y-1 text-sm text-ink-soft">
                {p.exclusions.map((i) => (
                  <li key={i} className="flex gap-2"><span className="text-sindoor">×</span>{i}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to={`/packages/${p.slug}`} className="btn btn-primary">
              See dates and request this trip
            </Link>
            <Link to="/search" className="btn btn-ghost">Just need a bus</Link>
          </div>
        </div>
      </Card>
    </section>
  );
}

/** The day's temples and sites, named. Shared with the package page. */
export function TempleList({ temples = [], className = '' }) {
  if (!temples.length) return null;
  return (
    <ul className={`mt-2 flex flex-wrap gap-1.5 ${className}`}>
      {temples.map((t) => (
        <li
          key={t}
          className="rounded-full border border-line bg-paper-2 px-2.5 py-0.5 text-xs text-ink-soft"
        >
          {t}
        </li>
      ))}
    </ul>
  );
}

const Fact = ({ label, value, sub }) => (
  <div>
    <p className="text-[10px] font-bold tracking-[0.1em] text-ink-soft uppercase">{label}</p>
    <p className="font-display text-2xl leading-tight">{value}</p>
    {sub && <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{sub}</p>}
  </div>
);

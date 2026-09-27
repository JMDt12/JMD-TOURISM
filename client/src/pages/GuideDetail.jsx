import { useParams, Link } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import { Card, Badge, Stars, Spinner, ErrorNote, PhotoSlot } from '../components/ui.jsx';
import { sceneForCity } from '../components/Artwork.jsx';
import { dateShort } from '../lib/format.js';

export default function GuideDetail() {
  const { id } = useParams();
  const { data, loading, error, reload } = useApi(`/guides/${id}`);

  if (loading) return <Spinner label="Loading guide" />;
  if (error) return <div className="mx-auto max-w-2xl p-4"><ErrorNote error={error} onRetry={reload} /></div>;

  const g = data.guide;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/guides" className="text-sm text-ink-soft hover:underline">← All guides</Link>

      <header className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
        <PhotoSlot scene={sceneForCity(g.baseCity)} label="Guide photo" name={g.name}
                   alt={`${g.name}, guide in ${g.baseCity}`}
                   ratio="aspect-square" className="w-32 shrink-0 sm:w-40" />
        <div>
          <h1 className="flex flex-wrap items-center gap-2 font-display text-3xl">
            {g.name}
            {g.verified && <Badge tone="verified">Verified by JMD</Badge>}
          </h1>
          <p className="mt-1 text-ink-soft">{g.specialty}</p>
          <p className="mt-2 flex flex-wrap items-center gap-3">
            <Stars value={g.rating} count={g.ratingCount} size="md" />
            <span className="text-sm text-ink-soft">{g.yearsExperience} years guiding · based in {g.baseCity}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {g.languages.map((l) => <Badge key={l}>{l}</Badge>)}
          </div>
          <p className="mt-3 text-sm text-ink-soft">
            Ask for {g.name.split(' ')[0]} when you send your trip request and our office will
            include them in the quote.
          </p>
        </div>
      </header>

      <Card className="mt-6 p-5">
        <h2 className="font-display text-xl">In their words</h2>
        <p className="mt-2 text-ink-soft">{g.bio}</p>
      </Card>

      <section className="mt-6">
        <h2 className="font-display text-xl">Ready-made itineraries</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {g.itineraries.map((it) => (
            <Card key={it.title} className="p-4">
              <p className="font-semibold">{it.title}</p>
              <p className="text-xs text-ink-soft">{it.hours} hours</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {it.stops.map((s) => (
                  <li key={s} className="rounded-full bg-paper-2 px-2 py-0.5 text-xs text-ink-soft">{s}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {!!g.busyDates.length && (
        <p className="mt-4 rounded-xl border border-line bg-paper-2 p-3 text-sm text-ink-soft">
          Already committed on: {g.busyDates.map((d) => dateShort(`${d}T00:00`)).join(' · ')}
        </p>
      )}

      <Card className="mt-6 border-marigold/40 bg-marigold-100/50 p-5">
        <h2 className="font-display text-xl">Booking {g.name.split(' ')[0]}</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Guides attach to a trip or package so the pickup, timing and vehicle all line up. Pick your
          journey first — {g.name.split(' ')[0]} appears as an add-on when you send the request.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to={`/search?to=${g.baseCity}`} className="btn btn-primary">
            Find a bus to {g.baseCity}
          </Link>
          <Link to="/packages" className="btn btn-ghost">See our Braj package</Link>
        </div>
      </Card>

      <section className="mt-8">
        <h2 className="font-display text-xl">Reviews</h2>
        {g.reviews.length ? (
          <ul className="mt-3 space-y-4">
            {g.reviews.map((r, i) => (
              <li key={i} className="border-b border-line pb-4 last:border-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars value={r.rating} />
                  {r.verified && <Badge tone="verified">Verified booking</Badge>}
                </div>
                <p className="mt-1.5 text-sm">{r.comment}</p>
                <p className="mt-1 text-xs text-ink-soft">{r.name}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">
            No reviews yet. We do not seed profiles with borrowed ratings — this one starts honest and empty.
          </p>
        )}
      </section>
    </div>
  );
}

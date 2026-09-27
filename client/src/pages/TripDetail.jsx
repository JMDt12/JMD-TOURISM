import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import SeatMap from '../components/SeatMap.jsx';
import MiniMap from '../components/MiniMap.jsx';
import { Card, Badge, Spinner, ErrorNote, PhotoSlot, Avatar, Stars, SourceBadge, Empty } from '../components/ui.jsx';
import { time, dateLong, duration, busTypeLabel } from '../lib/format.js';

export default function TripDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const { data, loading, error, reload } = useApi(`/trips/${id}`);
  const [partySize, setPartySize] = useState(Number(params.get('passengers')) || 10);
  const [pickupId, setPickupId] = useState('');

  if (loading) return <Spinner label="Loading trip" />;
  if (error) return <div className="mx-auto max-w-2xl p-4"><ErrorNote error={error} onRetry={reload} /></div>;

  const t = data.trip;
  const mapPath = t.routePath.filter((p) => p.lat && p.lng);
  const tooBig = partySize > t.capacity;

  const proceed = () => {
    navigate('/book', {
      state: { tripId: t.id, partySize, pickupPointId: pickupId || null },
    });
  };

  if (!t.available) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Empty
          title="This bus is already chartered"
          hint={`${t.bus.name} is confirmed for another group on the ${time(t.departure)} run, ${dateLong(t.departure)}. We only hire out whole vehicles, so it is off the board.`}
          action={
            <button className="btn btn-primary"
                    onClick={() => navigate(`/search?from=${t.route.origin}&to=${t.route.destination}&passengers=${partySize}`)}>
              See other departures
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-32 lg:pb-6">
      <button onClick={() => navigate(-1)} className="text-sm text-ink-soft hover:underline">← Back to results</button>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">
            {t.route.origin} <span className="text-marigold">→</span> {t.route.destination}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {dateLong(t.departure)} · {time(t.departure)} – {time(t.arrival)} · {duration(t.durationHrs)}
          </p>
        </div>
        <SourceBadge />
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card className="border-peacock/40 bg-peacock-100/50 p-5">
            <h2 className="font-display text-xl">The whole bus is yours</h2>
            <p className="mt-1 text-sm text-ink-soft">
              We do not sell single seats. You charter the vehicle — all {t.capacity} seats, the
              driver and the route — so nobody outside your group boards it.
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-3">
              <PhotoSlot scene="bus" label="Bus photo" name={t.bus.name} alt={t.bus.name}
                         ratio="aspect-[4/3]" className="w-28" />
              <div>
                <h2 className="font-display text-xl">{t.bus.name}</h2>
                <p className="text-sm text-ink-soft">
                  {busTypeLabel(t.bus.type)} · {t.capacity} seats · {t.bus.registrationNo}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {t.bus.amenities.map((a) => <Badge key={a}>{a}</Badge>)}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-paper-2 p-3">
              <Avatar name={t.driver.name} alt={`${t.driver.name}, your driver`} className="w-14" />
              <div className="text-sm">
                <p className="font-semibold">{t.driver.name}</p>
                <p className="text-ink-soft">
                  Your driver. On our payroll, and named before you commit — his number reaches
                  you the night before departure.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-xl">Seat plan</h2>
            <p className="mt-1 mb-4 text-sm text-ink-soft">
              {t.capacity} seats across {t.seatMap.decks.length === 2 ? 'two decks' : 'one deck'}.
              Sit where you like — the bus is booked to your group alone.
            </p>
            <SeatMap decks={t.seatMap.decks} capacity={t.capacity} />
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-xl">Route and stops</h2>
            <div className="mt-3">
              <MiniMap path={mapPath} height={220} />
            </div>
            <ol className="mt-4 space-y-0">
              {t.routePath.map((p, i) => (
                <li key={`${p.name}-${i}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`mt-1.5 size-2.5 rounded-full ${
                      i === 0 || i === t.routePath.length - 1 ? 'bg-indigo-brand' : 'border border-line bg-white'
                    }`} />
                    {i < t.routePath.length - 1 && <span className="w-px flex-1 bg-line" />}
                  </div>
                  <span className={`pb-4 text-sm ${
                    i === 0 || i === t.routePath.length - 1 ? 'font-semibold' : 'text-ink-soft'
                  }`}>
                    {p.name}
                    {i === 0 && ` · departs ${time(t.departure)}`}
                    {i === t.routePath.length - 1 && ` · arrives ${time(t.arrival)}`}
                  </span>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-xl">Cancellation policy</h2>
            <ul className="mt-3 divide-y divide-line text-sm">
              {t.cancellationPolicy.map((p) => (
                <li key={p.window} className="flex justify-between gap-4 py-2.5">
                  <span className="text-ink-soft">{p.window}</span>
                  <span className="shrink-0 font-semibold">{p.terms}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-xl">Reviews</h2>
            {t.reviews.length ? (
              <ul className="mt-3 space-y-4">
                {t.reviews.map((r, i) => (
                  <li key={i} className="border-b border-line pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
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
                No reviews on this bus yet. We only publish reviews from travellers who actually
                boarded, so a new coach starts empty rather than padded.
              </p>
            )}
          </Card>
        </div>

        <aside className="hidden lg:block">
          <Card className="sticky top-24 p-5">
            <Summary
              trip={t} partySize={partySize} setPartySize={setPartySize} tooBig={tooBig}
              pickupId={pickupId} setPickupId={setPickupId} onProceed={proceed}
            />
          </Card>
        </aside>
      </div>

      {/* Mobile sticky bar */}
      <div className="action-bar pad-safe-b border-t border-line bg-white p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg">Request this bus</p>
            <p className="truncate text-xs text-ink-soft">Whole bus · {t.capacity} seats</p>
          </div>
          <button className="btn btn-primary" disabled={tooBig} onClick={proceed}>Continue</button>
        </div>
      </div>
    </div>
  );
}

function Summary({ trip, partySize, setPartySize, tooBig, pickupId, setPickupId, onProceed }) {
  return (
    <>
      <h2 className="font-display text-lg">Request this bus</h2>
      <p className="mt-1 text-sm text-ink-soft">
        We quote by hand — season, group and vehicle all move the number — so send us the
        details and our Mathura office comes back to you.
      </p>

      <dl className="mt-3 space-y-2 text-sm">
        <Row label="Vehicle" value={`${trip.bus.name} (${trip.capacity} seats)`} />
      </dl>

      <div className="mt-4">
        <label className="label" htmlFor="party">How many are travelling?</label>
        <input
          id="party" type="number" className="field" min="1" max={trip.capacity}
          value={partySize}
          onChange={(e) => setPartySize(Number(e.target.value))}
        />
        <p className="mt-1 text-xs text-ink-soft">
          {tooBig
            ? `This bus seats ${trip.capacity}. Pick a bigger vehicle.`
            : 'You get the whole bus either way — this is for the manifest and the quote.'}
        </p>
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="pickup">Boarding point</label>
        <select id="pickup" className="field" value={pickupId}
                onChange={(e) => setPickupId(e.target.value)}>
          <option value="">Choose a pickup point</option>
          {trip.pickupPoints.map((p) => (
            <option key={p.id} value={p.id}>{p.area_name} — {p.landmark}</option>
          ))}
        </select>
      </div>

      <button className="btn btn-primary mt-4 w-full" disabled={tooBig} onClick={onProceed}>
        {tooBig ? 'Group too large for this bus' : 'Continue to details'}
      </button>
      <p className="mt-2 text-center text-xs text-ink-soft">
        Add a guide, rooms or meals on the next step. Nothing is committed until you accept
        our quote.
      </p>
    </>
  );
}

const Row = ({ label, value }) => (
  <div className="flex justify-between gap-3">
    <dt className="text-ink-soft">{label}</dt>
    <dd className="text-right font-medium">{value}</dd>
  </div>
);

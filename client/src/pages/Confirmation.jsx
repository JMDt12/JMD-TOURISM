import { useParams, Link } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import { Card, Spinner, ErrorNote, Badge, SourceBadge } from '../components/ui.jsx';
import { dateLong, time } from '../lib/format.js';
import { BRAND, CONTROL_ROOM, PRIMARY_PHONE, telLink, waLink } from '../lib/brand.js';


/**
 * One page, two states: a request that the office has yet to quote, and a
 * confirmed trip with a QR ticket. The reference is the same either way, so
 * the link a traveller saves stays good all the way through.
 */
export default function Confirmation() {
  const { reference } = useParams();
  const { data, loading, error, reload } = useApi(`/bookings/${reference}`);

  if (loading) return <Spinner label="Fetching your request" />;
  if (error) return <div className="mx-auto max-w-lg p-4"><ErrorNote error={error} onRetry={reload} /></div>;

  const b = data.booking;
  const confirmed = b.confirmed;
  const what = b.trip
    ? `${b.trip.origin} to ${b.trip.destination}`
    : b.rental?.name ?? b.package?.title ?? 'your trip';
  const waMessage = (
    `Jai Maa Durge Tourism request ${b.reference}: ${what}` +
    (b.departure ? ` on ${dateLong(b.departure)}` : b.travelDate ? ` from ${b.travelDate}` : '')
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="text-center">
        <div className={`mx-auto grid size-14 place-items-center rounded-full text-2xl ${
          confirmed ? 'bg-peacock-100 text-peacock' : 'bg-marigold-100 text-marigold-dark'
        }`}>
          {confirmed ? '✓' : '⌛'}
        </div>
        <h1 className="mt-3 font-display text-2xl sm:text-3xl">
          {confirmed ? 'Your trip is confirmed' : 'Request received'}
        </h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
          {confirmed
            ? 'Show the QR below at boarding. The driver’s number reaches you the night before.'
            : 'Our Mathura office is looking at it now and will WhatsApp you a quote. We price every trip by hand, so a real person reads this — usually within a couple of hours during the day.'}
        </p>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between gap-3 bg-indigo-brand px-5 py-3 text-white">
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] text-marigold uppercase">Reference</p>
            <p className="font-display text-xl">{b.reference}</p>
          </div>
          <StatusBadge status={b.bookingStatus} />
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto]">
          <div className="space-y-3 text-sm">
            {b.trip && (
              <>
                <div>
                  <p className="font-display text-lg">{b.trip.origin} → {b.trip.destination}</p>
                  <p className="text-ink-soft">{dateLong(b.departure)}</p>
                  <p className="text-ink-soft">Departs {time(b.departure)} · arrives {time(b.arrival)}</p>
                </div>
                <Detail label="Bus" value={`${b.trip.busName} · ${b.trip.registrationNo}`} />
                {confirmed && (
                  <Detail label="Driver" value={`${b.trip.driverName} · ${b.trip.driverPhone}`} />
                )}
                <Detail label="Vehicle" value={`Whole bus, all ${b.capacity} seats`} />
              </>
            )}
            {b.package && (
              <>
                <p className="font-display text-lg">{b.package.title}</p>
                <Detail label="Starts" value={dateLong(b.travelDate)} />
                {b.package.baseCamp && <Detail label="Base camp" value={b.package.baseCamp} />}
              </>
            )}
            {b.rental && (
              <>
                <div>
                  <p className="font-display text-lg">{b.rental.name}</p>
                  {b.rental.subtitle && <p className="text-ink-soft">{b.rental.subtitle}</p>}
                </div>
                <Detail
                  label={b.rental.kind === 'room' ? 'Check in' : 'Pick up'}
                  value={`${dateLong(b.travelDate)} · ${b.rental.city}${b.rental.area ? `, ${b.rental.area}` : ''}`}
                />
                {b.endDate && (
                  <Detail
                    label={b.rental.kind === 'room' ? 'Check out' : 'Return'}
                    value={dateLong(b.endDate)}
                  />
                )}
                <Detail
                  label="How many"
                  value={`${b.units} ${b.rental.kind === 'room' ? 'room' : b.rental.kind}${b.units > 1 ? 's' : ''}`}
                />
                {b.rental.withDriver && <Detail label="Driver" value="Included" />}
              </>
            )}
            <Detail label="Travelling" value={`${b.partySize} people`} />
            {b.pickup && (
              <Detail label="Boarding" value={`${b.pickup.area_name}, ${b.pickup.city} — ${b.pickup.landmark}`} />
            )}
            <Detail label="Lead passenger" value={b.passengers.map((p) => p.name).join(', ')} />
          </div>

          {confirmed && b.qrDataUrl && (
            <div className="justify-self-center text-center">
              <img src={b.qrDataUrl} alt={`QR ticket for booking ${b.reference}`}
                   className="size-40 rounded-lg border border-line bg-white p-1.5" />
              <p className="mt-1.5 text-xs text-ink-soft">Show at boarding</p>
            </div>
          )}
        </div>

        {b.addons.length > 0 && (
          <div className="border-t border-line px-5 py-4">
            <p className="label">Asked for</p>
            <ul className="space-y-1 text-sm">
              {b.addons.map((a) => <li key={a.label}>{a.label}</li>)}
            </ul>
            {b.addons.some((a) => a.code === 'guide') && (
              <p className="mt-2 text-xs text-ink-soft">
                {confirmed
                  ? 'Your guide has been sent the request and will confirm. You will get their number on WhatsApp.'
                  : 'We will confirm your guide’s availability along with the quote.'}
              </p>
            )}
          </div>
        )}

        {!confirmed && (
          <div className="border-t border-line bg-paper-2 px-5 py-4 text-sm text-ink-soft">
            <p className="font-medium text-ink">What happens next</p>
            <ol className="mt-2 space-y-1">
              <li>1. Our office reads your request and works out the price.</li>
              <li>2. You get a quote on WhatsApp at the number you gave us.</li>
              <li>3. Accept it and we hold the bus, then this page becomes your ticket.</li>
            </ol>
          </div>
        )}
      </Card>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {confirmed && b.trackUrl && (
          <Link to={`/track/${b.trip.id}`} className="btn btn-ink">Track this bus live</Link>
        )}
        <a className={`btn btn-ghost ${confirmed ? '' : 'sm:col-span-2'}`}
           href={waLink(PRIMARY_PHONE.dial, waMessage)}
           target="_blank" rel="noreferrer">
          {confirmed ? 'Share on WhatsApp' : 'Chase this up on WhatsApp'}
        </a>
        <Link to="/my-trips" className="btn btn-ghost sm:col-span-2">Go to My Trips</Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-center text-xs text-ink-soft">
        <SourceBadge compact />
        <span>
          Questions? Call our Mathura control room on{' '}
          <a className="underline" href={telLink(CONTROL_ROOM.dial)}>{CONTROL_ROOM.display}</a>, any hour.
        </span>
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    new: ['warn', 'Awaiting quote'],
    quoted: ['warn', 'Quote sent'],
    confirmed: ['verified', 'Confirmed'],
    completed: ['verified', 'Completed'],
    cancelled: ['live', 'Cancelled'],
  };
  const [tone, label] = map[status] ?? ['neutral', status];
  return <Badge tone={tone}>{label}</Badge>;
}

const Detail = ({ label, value }) => (
  <div>
    <span className="label mb-0">{label}</span>
    <span className="block">{value}</span>
  </div>
);

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useApi } from '../lib/useApi.js';
import MiniMap from '../components/MiniMap.jsx';
import { Card, Badge, Spinner, ErrorNote, Avatar } from '../components/ui.jsx';
import { time, dateLong, ago } from '../lib/format.js';

/**
 * Public page: no sign-in. Anyone holding the link can watch the bus, which
 * is the point — the traveller shares it with whoever is waiting at the other end.
 */
export default function Track() {
  const { tripId } = useParams();
  const { data, loading, error, reload } = useApi(`/tracking/${tripId}`);
  const [position, setPosition] = useState(null);
  const [connected, setConnected] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const socket = io({ transports: ['websocket', 'polling'] });
    socket.on('connect', () => {
      setConnected(true);
      socket.emit('trip:subscribe', Number(tripId));
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('trip:location', (p) => {
      if (Number(p.tripId) === Number(tripId)) setPosition(p);
    });
    socket.on('trip:completed', () => reload());
    return () => {
      socket.emit('trip:unsubscribe', Number(tripId));
      socket.close();
    };
  }, [tripId, reload]);

  if (loading) return <Spinner label="Locating the bus" />;
  if (error) return <div className="mx-auto max-w-2xl p-4"><ErrorNote error={error} onRetry={reload} /></div>;

  const { trip, path, eta, remainingKm, simulated, hqPhone } = data;
  const pos = position ?? data.position;
  const progress = Math.round((pos?.progress ?? 0) * 100);
  const done = trip.status === 'completed' || progress >= 100;

  const share = async () => {
    const url = window.location.href;
    const text = `Following the ${trip.origin} to ${trip.destination} bus (${trip.registrationNo}): ${url}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Jai Maa Durge Tourism live tracking', text, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch { /* the user dismissed the share sheet */ }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">
            {trip.origin} <span className="text-marigold">→</span> {trip.destination}
          </h1>
          <p className="text-sm text-ink-soft">
            {dateLong(trip.departure)} · scheduled {time(trip.departure)} – {time(trip.scheduledArrival)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge tone={done ? 'verified' : trip.status === 'ongoing' ? 'live' : 'neutral'}>
            {done ? 'Arrived'
              : trip.status === 'ongoing'
                ? <><span className="live-dot size-1.5 rounded-full bg-sindoor" /> On the road</>
                : 'Not started'}
          </Badge>
          <span className={`text-[11px] ${connected ? 'text-peacock' : 'text-ink-soft'}`}>
            {connected ? 'Live feed connected' : 'Reconnecting…'}
          </span>
        </div>
      </header>

      <Card className="mt-5 overflow-hidden">
        <MiniMap
          path={path}
          markers={pos ? [{ lat: pos.lat, lng: pos.lng, label: 'Bus' }] : []}
          height={280}
          className="rounded-none border-0"
        />

        <div className="p-4">
          <div className="h-2 overflow-hidden rounded-full bg-paper-2">
            <div className="h-full rounded-full bg-marigold transition-[width] duration-1000"
                 style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-ink-soft">
            <span>{trip.origin}</span>
            <span>{progress}% of the way</span>
            <span>{trip.destination}</span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Stat label="ETA" value={done ? 'Arrived' : eta ? time(eta) : '—'} />
            <Stat label="Remaining" value={done ? '0 km' : `${remainingKm} km`} />
            <Stat label="Speed" value={pos ? `${pos.speed} km/h` : '—'} />
          </div>
          {pos && (
            <p className="mt-2 text-center text-xs text-ink-soft">Position updated {ago(pos.at)}</p>
          )}
        </div>
      </Card>

      {simulated && (
        <p className="mt-3 rounded-xl border border-marigold/30 bg-marigold-100 p-3 text-xs text-marigold-dark">
          This position comes from the built-in simulator, not a real vehicle. Once the driver app
          pushes GPS (or the driver toggles sharing in their portal), the same feed carries live data
          with no change to this page.
        </p>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <p className="label">Your bus</p>
          <p className="font-semibold">{trip.busName}</p>
          <p className="text-sm text-ink-soft">{trip.registrationNo}</p>
          <div className="mt-3 flex items-center gap-3">
            <Avatar name={trip.driver.name} alt={`${trip.driver.name}, your driver`} className="w-12" />
            <div className="text-sm">
              <p className="font-medium">{trip.driver.name}</p>
              <a className="text-indigo-brand underline" href={`tel:${trip.driver.phone}`}>
                {trip.driver.phone}
              </a>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <p className="label">Stops on this route</p>
          <ol className="space-y-1 text-sm">
            <li className="font-medium">{trip.origin}</li>
            {trip.stops.map((s) => <li key={s.name} className="text-ink-soft">{s.name}</li>)}
            <li className="font-medium">{trip.destination}</li>
          </ol>
        </Card>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button className="btn btn-ink" onClick={share}>
          {copied ? 'Link copied' : 'Share this live link'}
        </button>
        <a className="btn btn-ghost" href={`tel:${hqPhone.replace(/\s/g, '')}`}>
          Call Mathura control room
        </a>
      </div>
      <p className="mt-3 text-center text-xs text-ink-soft">
        Anyone with this link can follow the bus. No account needed.
      </p>
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-line bg-paper-2 p-3">
    <p className="text-[10px] font-bold tracking-[0.1em] text-ink-soft uppercase">{label}</p>
    <p className="font-display text-lg">{value}</p>
  </div>
);

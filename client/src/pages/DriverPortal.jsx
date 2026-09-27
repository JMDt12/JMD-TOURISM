import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { api } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { Card, Badge, Spinner, ErrorNote, Empty } from '../components/ui.jsx';
import { time, dateLong } from '../lib/format.js';

export default function DriverPortal() {
  const { data, loading, error, reload } = useApi('/driver/schedule');
  const [tripId, setTripId] = useState(null);

  if (loading) return <Spinner label="Loading your schedule" />;
  if (error) return <div className="mx-auto max-w-2xl p-4"><ErrorNote error={error} onRetry={reload} /></div>;

  const trips = data.trips;
  const selected = trips.find((t) => t.id === tripId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="font-display text-2xl sm:text-3xl">Driver portal</h1>
      <p className="text-sm text-ink-soft">Your trips, location sharing, and boarding check-in.</p>

      {!trips.length && (
        <div className="mt-5">
          <Empty title="No trips assigned" hint="Trips appear here once HQ puts your bus on a route." />
        </div>
      )}

      <div className="mt-5 space-y-3">
        {trips.slice(0, 12).map((t) => (
          <TripCard key={t.id} t={t} onReload={reload}
                    open={tripId === t.id} onOpen={() => setTripId(tripId === t.id ? null : t.id)} />
        ))}
      </div>

      {selected && <Scanner trip={selected} />}
    </div>
  );
}

/** How often a moving bus reports in. Often enough for the map, easy on data. */
const GPS_INTERVAL_MS = 15000;
const hasGps = () => typeof navigator !== 'undefined' && 'geolocation' in navigator;

/**
 * While sharing is on, send this phone's real position. The browser only
 * reports while the page is open, so it also asks the screen to stay awake.
 */
function useGpsFeed(tripId, active) {
  const [gps, setGps] = useState({ state: 'idle', message: null, at: null });
  useEffect(() => {
    if (!active || !hasGps()) return undefined;
    let last = 0;
    let lock = null;
    navigator.wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => {});
    setGps({ state: 'waiting', message: 'Waiting for a GPS fix…', at: null });
    const watch = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - last < GPS_INTERVAL_MS) return;
        last = now;
        try {
          await api.post(`/tracking/${tripId}/location`, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            // Speed arrives in metres per second, or null when standing still.
            speed: pos.coords.speed != null ? pos.coords.speed * 3.6 : 0,
          });
          setGps({ state: 'ok', message: null, at: new Date() });
        } catch (e) {
          last = 0; // try again on the next fix
          setGps({ state: 'error', message: e.message, at: null });
        }
      },
      (err) => setGps({
        state: 'error',
        message: err.code === err.PERMISSION_DENIED
          ? 'Location is blocked. Allow location for this site in your browser settings.'
          : 'Cannot read GPS right now. Move into the open, or check location is on.',
        at: null,
      }),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 },
    );
    return () => {
      navigator.geolocation.clearWatch(watch);
      lock?.release?.().catch(() => {});
    };
  }, [tripId, active]);
  return gps;
}

function TripCard({ t, onReload, open, onOpen }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const gps = useGpsFeed(t.id, t.sharingLocation);

  const toggleSharing = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/driver/trips/${t.id}/sharing`, { on: !t.sharingLocation, gps: hasGps() });
      onReload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={`overflow-hidden ${open ? 'border-indigo-brand' : ''}`}>
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-display text-lg">{t.origin} → {t.destination}</p>
            <p className="text-sm text-ink-soft">
              {dateLong(t.departure)} · {time(t.departure)} – {time(t.arrival)}
            </p>
            <p className="text-sm text-ink-soft">{t.busName} · {t.registrationNo}</p>
          </div>
          <div className="text-right">
            <Badge tone={t.status === 'ongoing' ? 'live' : 'neutral'}>{t.status}</Badge>
            <p className="mt-1 text-xs text-ink-soft">{t.bookings} booking{t.bookings === 1 ? '' : 's'}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            className={`btn py-1.5 text-sm ${t.sharingLocation ? 'btn-ghost text-sindoor' : 'btn-ink'}`}
            disabled={busy}
            onClick={toggleSharing}
          >
            {t.sharingLocation ? 'Stop sharing location' : 'Start sharing location'}
          </button>
          <button className="btn btn-ghost py-1.5 text-sm" onClick={onOpen}>
            {open ? 'Close check-in' : 'Check in passengers'}
          </button>
          {t.sharingLocation && gps.state !== 'error' && (
            <span className="flex items-center gap-1.5 text-xs text-peacock" role="status">
              <span className="live-dot size-2 rounded-full bg-peacock" />
              {gps.state === 'ok'
                ? `Broadcasting to HQ and travellers · last sent ${time(gps.at)}`
                : hasGps() ? 'Waiting for a GPS fix…' : 'Broadcasting to HQ and travellers'}
            </span>
          )}
        </div>
        {t.sharingLocation && gps.state === 'error' && (
          <p className="mt-2 text-sm text-sindoor" role="alert">{gps.message}</p>
        )}
        {t.sharingLocation && (
          <p className="mt-2 text-xs text-ink-soft">Keep this page open while driving; the phone only reports while it is on screen.</p>
        )}
        {error && <p className="mt-2 text-sm text-sindoor" role="alert">{error}</p>}
      </div>

      {open && <Manifest tripId={t.id} />}
    </Card>
  );
}

function Manifest({ tripId }) {
  const { data, loading, reload } = useApi(`/driver/trips/${tripId}/manifest`);
  if (loading) return <div className="border-t border-line p-4"><Spinner label="Loading manifest" /></div>;
  const rows = data?.manifest ?? [];

  return (
    <div className="border-t border-line bg-paper-2 p-4">
      <div className="flex items-center justify-between">
        <p className="label mb-0">Passenger manifest</p>
        <button className="text-xs underline" onClick={reload}>Refresh</button>
      </div>
      {!rows.length && <p className="mt-2 text-sm text-ink-soft">Nobody booked on this trip yet.</p>}
      <ul className="mt-2 divide-y divide-line">
        {rows.map((r) => (
          <li key={r.reference} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <span>
              <span className="font-medium">{r.passengers.map((p) => p.name).join(', ')}</span>
              <span className="block text-xs text-ink-soft">
                {r.reference} · whole bus, {r.partySize} travelling · {r.pickup ?? 'pickup TBC'}
              </span>
            </span>
            <span className="flex items-center gap-2">
              {!r.confirmed && <Badge tone="warn">Not confirmed</Badge>}
              <Badge tone={r.checkedInAt ? 'verified' : 'neutral'}>
                {r.checkedInAt ? 'Boarded' : 'Not boarded'}
              </Badge>
              <a className="text-xs underline" href={`tel:${r.contactPhone}`}>Call</a>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * QR check-in. Uses the device camera where it is available (needs HTTPS or
 * localhost); the reference field below always works, including on a cracked
 * screen in the dark at 5am, which is the actual failure mode here.
 */
function Scanner({ trip }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [manual, setManual] = useState('');
  const streamRef = useRef(null);

  const submit = async (code) => {
    if (!code) return;
    try {
      const r = await api.post('/driver/check-in', { code, tripId: trip.id });
      setResult({ ok: true, text: `${r.name} boarded · whole bus · party of ${r.partySize}` });
    } catch (e) {
      setResult({ ok: false, text: e.message });
    }
    setManual('');
  };

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  useEffect(() => () => stop(), []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setScanning(true);
    } catch {
      setResult({ ok: false, text: 'Camera unavailable. Type the booking reference instead.' });
    }
  };

  useEffect(() => {
    if (!scanning) return;
    let raf;
    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video?.readyState === video?.HAVE_ENOUGH_DATA && canvas) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR(img.data, img.width, img.height);
        if (found?.data) {
          stop();
          submit(found.data);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scanning]);

  return (
    <Card className="mt-5 p-4">
      <h2 className="font-display text-xl">
        Boarding check-in · {trip.origin} → {trip.destination}
      </h2>

      {result && (
        <p className={`mt-3 rounded-xl border p-3 text-sm ${
          result.ok ? 'border-peacock/30 bg-peacock-100 text-peacock'
                    : 'border-sindoor/30 bg-sindoor-100 text-sindoor'}`}>
          {result.text}
        </p>
      )}

      <div className="mt-3">
        {scanning ? (
          <>
            <video ref={videoRef} playsInline muted
                   className="w-full rounded-xl border border-line bg-black" />
            <button className="btn btn-ghost mt-2 w-full" onClick={stop}>Stop camera</button>
          </>
        ) : (
          <button className="btn btn-ink w-full" onClick={start}>Scan QR ticket with camera</button>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <form className="mt-3 flex gap-2"
            onSubmit={(e) => { e.preventDefault(); submit(manual.trim().toUpperCase()); }}>
        <input
          className="field" placeholder="Or type booking reference, e.g. JMD-DEMO01"
          value={manual} onChange={(e) => setManual(e.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={!manual.trim()}>Check in</button>
      </form>
    </Card>
  );
}

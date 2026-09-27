import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { connectSocket } from '../lib/socket.js';
import { api } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import MiniMap from '../components/MiniMap.jsx';
import { Card, Badge, Spinner, ErrorNote, Empty } from '../components/ui.jsx';
import { StatusBadge } from './Confirmation.jsx';
import { ago, dateShort } from '../lib/format.js';

const TABS = [
  ['enquiries', 'Enquiries'],
  ['live', 'Live map'],
  ['fleet', 'Fleet'],
  ['guides', 'Guides'],
  ['analytics', 'Analytics'],
  ['outbox', 'Messages'],
];

export default function Hq() {
  const [tab, setTab] = useState('enquiries');
  const overview = useApi('/admin/overview');

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header>
        <p className="text-[11px] font-bold tracking-[0.14em] text-marigold-dark uppercase">
          Vrindavan head office
        </p>
        <h1 className="font-display text-2xl sm:text-3xl">HQ Control Center</h1>
      </header>

      {overview.data && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="New enquiries" value={overview.data.newEnquiries} tone="marigold" />
          <Kpi label="Awaiting reply" value={overview.data.awaitingReply} />
          <Kpi label="Confirmed trips" value={overview.data.confirmedTrips} tone="peacock" />
          <Kpi label="On the road now" value={overview.data.activeTrips} />
        </div>
      )}

      <nav className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            aria-pressed={tab === k}
            className={`shrink-0 rounded-lg border px-3.5 py-2 text-sm font-semibold ${
              tab === k ? 'border-indigo-brand bg-indigo-brand text-white' : 'border-line bg-white hover:bg-paper-2'
            }`}
          >
            {label}
            {k === 'enquiries' && overview.data?.newEnquiries > 0 && (
              <span className="ml-1.5 rounded-full bg-marigold px-1.5 text-[10px] text-[#2a1500]">
                {overview.data.newEnquiries}
              </span>
            )}
            {k === 'guides' && overview.data?.guidesAwaitingVerification > 0 && (
              <span className="ml-1.5 rounded-full bg-marigold px-1.5 text-[10px] text-[#2a1500]">
                {overview.data.guidesAwaitingVerification}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="mt-5">
        {tab === 'enquiries' && <Enquiries onChange={overview.reload} />}
        {tab === 'live' && <LiveMap />}
        {tab === 'fleet' && <Fleet />}
        {tab === 'guides' && <GuideQueue onChange={overview.reload} />}
        {tab === 'analytics' && <Analytics />}
        {tab === 'outbox' && <Outbox />}
      </div>
    </div>
  );
}

const Kpi = ({ label, value, tone }) => (
  <Card className={`p-4 ${tone === 'peacock' ? 'border-peacock/30 bg-peacock-100'
                    : tone === 'marigold' ? 'border-marigold/30 bg-marigold-100' : ''}`}>
    <p className="text-[10px] font-bold tracking-[0.1em] text-ink-soft uppercase">{label}</p>
    <p className="font-display text-2xl">{value}</p>
  </Card>
);

/**
 * The queue the office actually works from. Quoting happens on the phone, so
 * this records where each request has got to and commits the vehicle at the
 * moment someone is confirmed.
 */
function Enquiries({ onChange }) {
  const [status, setStatus] = useState('');
  const { data, loading, reload } = useApi(`/admin/enquiries${status ? `?status=${status}` : ''}`);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);

  const act = async (reference, action) => {
    setBusy(reference);
    setNotice(null);
    try {
      const r = await api.post(`/admin/enquiries/${reference}/${action}`);
      setNotice(`${reference} → ${r.status}`);
      reload();
      onChange?.();
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusy(null);
    }
  };

  const FILTERS = [
    ['', 'All'], ['new', 'New'], ['quoted', 'Quoted'],
    ['confirmed', 'Confirmed'], ['cancelled', 'Cancelled'],
  ];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {FILTERS.map(([k, l]) => (
          <button key={k} onClick={() => setStatus(k)} aria-pressed={status === k}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    status === k ? 'border-indigo-brand bg-indigo-brand text-white' : 'border-line bg-white'}`}>
            {l}
          </button>
        ))}
        <button className="ml-auto text-xs underline" onClick={reload}>Refresh</button>
      </div>

      {notice && (
        <p className="mb-3 rounded-xl border border-peacock/30 bg-peacock-100 p-3 text-sm text-peacock">
          {notice}
        </p>
      )}

      {loading ? <Spinner /> : !data?.enquiries?.length ? (
        <Empty title="Nothing in the queue" hint="New trip requests land here as travellers send them." />
      ) : (
        <div className="space-y-3">
          {data.enquiries.map((e) => (
            <Card key={e.reference} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg">{e.reference}</span>
                    <StatusBadge status={e.status} />
                    <span className="text-xs text-ink-soft">asked {ago(e.createdAt)}</span>
                  </div>
                  <p className="mt-1 font-medium">{e.what}</p>
                  <p className="text-sm text-ink-soft">
                    {e.departure ? dateShort(e.departure) : e.travelDate ? dateShort(`${e.travelDate}T00:00`) : 'date TBC'}
                    {' · '}party of {e.partySize}
                    {e.vehicle ? ` · ${e.vehicle}` : ''}
                  </p>
                  {e.pickup && <p className="text-sm text-ink-soft">Boarding: {e.pickup}</p>}
                  {!!e.addons.length && (
                    <p className="mt-1 text-sm text-ink-soft">Asked for: {e.addons.map((a) => a.label).join(' · ')}</p>
                  )}
                  {e.notes && (
                    <p className="mt-2 rounded-lg border border-marigold/30 bg-marigold-100 p-2.5 text-sm text-marigold-dark">
                      <span className="font-semibold">Their note: </span>{e.notes}
                    </p>
                  )}
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">{e.customer}</p>
                  <a className="text-indigo-brand underline" href={`tel:${e.contactPhone || e.phone}`}>
                    {e.contactPhone || e.phone}
                  </a>
                  {e.contactPhone && e.contactPhone !== e.phone && (
                    <span className="block text-xs text-ink-soft">account {e.phone}</span>
                  )}
                  {e.contactEmail && (
                    <a className="block text-xs text-ink-soft underline" href={`mailto:${e.contactEmail}`}>
                      {e.contactEmail}
                    </a>
                  )}
                  <div className="mt-1 flex justify-end gap-2 text-xs">
                    <a className="underline"
                       href={`https://wa.me/91${e.contactPhone || e.phone}?text=${encodeURIComponent(`Jai Maa Durge Tourism, about your request ${e.reference}: `)}`}
                       target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {e.status === 'new' && (
                  <button className="btn btn-ghost py-1.5 text-xs" disabled={busy === e.reference}
                          onClick={() => act(e.reference, 'quote')}>
                    Mark quoted
                  </button>
                )}
                {['new', 'quoted'].includes(e.status) && (
                  <button className="btn btn-primary py-1.5 text-xs" disabled={busy === e.reference}
                          onClick={() => act(e.reference, 'confirm')}>
                    Confirm and issue ticket
                  </button>
                )}
                {e.status !== 'cancelled' && (
                  <button className="btn btn-ghost ml-auto py-1.5 text-xs text-sindoor"
                          disabled={busy === e.reference}
                          onClick={() => act(e.reference, 'cancel')}>
                    Cancel
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

/** Every bus in motion on one map, updating over the socket. */
function LiveMap() {
  const { data, loading, error, reload } = useApi('/tracking');
  const [positions, setPositions] = useState({});

  useEffect(() => {
    const socket = connectSocket();
    socket.on('connect', () => socket.emit('hq:subscribe'));
    socket.on('hq:location', (p) => setPositions((cur) => ({ ...cur, [p.tripId]: p })));
    return () => socket.close();
  }, []);

  if (loading) return <Spinner label="Loading the fleet" />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;

  const active = data.active.map((t) => ({ ...t, position: positions[t.id] ?? t.position }));
  const markers = active
    .filter((t) => t.position)
    .map((t) => ({ lat: t.position.lat, lng: t.position.lng, label: t.registrationNo.split(' ').at(-1) }));

  // A neutral frame over the operating area so buses are not floating in space.
  const frame = Object.entries(data.cities)
    .filter(([name]) => ['Delhi', 'Mathura', 'Agra', 'Varanasi', 'Shimla', 'Nainital'].includes(name))
    .map(([name, c]) => ({ name, ...c }));

  return (
    <>
      {!active.length && <Empty title="No buses on the road right now" hint="Trips appear here the moment a driver starts sharing location." />}
      {!!active.length && (
        <Card className="overflow-hidden">
          <MiniMap path={frame} markers={markers} height={340} className="rounded-none border-0" showLabels />
          <div className="max-h-80 divide-y divide-line overflow-y-auto">
            {active.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span className="min-w-0">
                  <span className="font-medium">{t.origin} → {t.destination}</span>
                  <span className="block text-xs text-ink-soft">
                    {t.busName} · {t.registrationNo} · {t.driverName} ({t.driverPhone})
                  </span>
                </span>
                <span className="flex items-center gap-3 text-xs">
                  <span className="text-ink-soft">{t.bookings} confirmed</span>
                  {t.position && (
                    <>
                      <Badge tone="live">{Math.round(t.position.progress * 100)}%</Badge>
                      <span className="text-ink-soft">{t.position.speed} km/h · {ago(t.position.at)}</span>
                    </>
                  )}
                  <Link className="underline" to={`/track/${t.id}`}>Open</Link>
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

function Fleet() {
  const { data, loading } = useApi('/admin/buses');
  if (loading) return <Spinner />;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data.buses.map((b) => (
        <Card key={b.id} className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-lg">{b.name}</p>
              <p className="text-xs text-ink-soft">{b.registrationNo} · {b.capacity} seats</p>
            </div>
            <Badge tone="ink">{b.type.replace(/_/g, ' ')}</Badge>
          </div>
          <p className="mt-2 text-sm">Driver {b.driverName} · {b.driverPhone}</p>
          <p className="text-xs text-ink-soft">{b.upcomingTrips} scheduled trips</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {b.amenities.map((a) => <Badge key={a}>{a}</Badge>)}
          </div>
          {!b.photos.length && (
            <p className="mt-3 rounded-lg border border-dashed border-line bg-paper-2 p-2 text-xs text-ink-soft">
              No photographs on file. Travellers see our own illustration of a coach until you
              add real ones — photo upload needs an S3 bucket, not configured in this build.
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}

function GuideQueue({ onChange }) {
  const { data, loading, reload } = useApi('/admin/guides');
  const [busy, setBusy] = useState(null);
  if (loading) return <Spinner />;

  const decide = async (id, approve) => {
    setBusy(id);
    try { await api.post(`/admin/guides/${id}/verify`, { approve }); reload(); onChange?.(); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-3">
      {data.guides.map((g) => (
        <Card key={g.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="font-medium">{g.name} <span className="text-xs text-ink-soft">· {g.phone}</span></p>
            <p className="text-sm text-ink-soft">
              {g.specialty} · {g.baseCity} · {g.languages.join(', ')} · {g.yearsExperience} yrs
            </p>
            <p className="text-xs text-ink-soft">ID document: {g.idProofUrl || 'not uploaded'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={g.status === 'verified' ? 'verified' : g.status === 'pending' ? 'warn' : 'live'}>
              {g.status}
            </Badge>
            {g.status !== 'verified' && (
              <button className="btn btn-primary py-1.5 text-xs" disabled={busy === g.id}
                      onClick={() => decide(g.id, true)}>Verify</button>
            )}
            {g.status !== 'rejected' && (
              <button className="btn btn-ghost py-1.5 text-xs text-sindoor" disabled={busy === g.id}
                      onClick={() => decide(g.id, false)}>Reject</button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function Analytics() {
  const { data, loading } = useApi('/admin/analytics/routes');
  if (loading) return <Spinner />;
  const max = Math.max(1, ...data.demandByRoute.map((r) => r.enquiries));

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="font-display text-xl">Demand by route</h2>
        <p className="text-xs text-ink-soft">Requests received, and how many became trips.</p>
        {!data.demandByRoute.length && (
          <p className="mt-3 text-sm text-ink-soft">No requests yet.</p>
        )}
        <ul className="mt-3 space-y-2">
          {data.demandByRoute.slice(0, 8).map((r) => (
            <li key={r.route}>
              <div className="flex justify-between text-sm">
                <span>{r.route}</span>
                <span className="font-semibold">{r.confirmed}/{r.enquiries} confirmed</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-paper-2">
                <div className="h-full rounded-full bg-indigo-brand"
                     style={{ width: `${Math.max(2, (r.enquiries / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <h2 className="font-display text-xl">Charter rate</h2>
        <p className="text-xs text-ink-soft">Departures chartered against departures run, next 7 days.</p>
        <ul className="mt-3 space-y-2">
          {data.occupancy.slice(0, 8).map((r) => (
            <li key={r.route}>
              <div className="flex justify-between text-sm">
                <span>{r.route}</span>
                <span className="font-semibold">{r.pct}%</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-paper-2">
                <div className={`h-full rounded-full ${r.pct > 70 ? 'bg-peacock' : r.pct > 35 ? 'bg-marigold' : 'bg-sindoor'}`}
                     style={{ width: `${Math.max(2, r.pct)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/** WhatsApp broadcast plus the outbox of what actually went out. */
function Outbox() {
  const { data, loading, reload } = useApi('/admin/notifications');
  const [segment, setSegment] = useState('upcoming');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const send = async () => {
    setBusy(true);
    try {
      const r = await api.post('/admin/broadcast', { segment, message });
      setResult(`Queued to ${r.queued} recipients.`);
      setMessage('');
      reload();
    } catch (e) {
      setResult(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <Card className="h-fit p-5">
        <h2 className="font-display text-xl">WhatsApp broadcast</h2>
        <div className="mt-3 space-y-3">
          <div>
            <label className="label" htmlFor="seg">Send to</label>
            <select id="seg" className="field" value={segment} onChange={(e) => setSegment(e.target.value)}>
              <option value="upcoming">Travellers with confirmed trips</option>
              <option value="enquirers">Open enquiries, not yet confirmed</option>
              <option value="all_customers">All customers</option>
              <option value="guides">All guides</option>
              <option value="drivers">All drivers</option>
            </select>
          </div>
          <textarea className="field" rows={4} value={message} placeholder="Type the message…"
                    onChange={(e) => setMessage(e.target.value)} />
          <button className="btn btn-primary w-full" disabled={busy || message.trim().length < 5} onClick={send}>
            {busy ? 'Queuing…' : 'Send broadcast'}
          </button>
          {result && <p className="text-sm text-peacock">{result}</p>}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Outbox</h2>
          <button className="text-xs underline" onClick={reload}>Refresh</button>
        </div>
        {loading ? <Spinner /> : (
          <ul className="mt-3 max-h-[28rem] divide-y divide-line overflow-y-auto text-sm">
            {(data?.notifications ?? []).map((n) => (
              <li key={n.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={n.status === 'sent' ? 'verified' : 'warn'}>{n.status}</Badge>
                  <span className="text-xs text-ink-soft">{n.channel} → {n.recipient} · {n.template}</span>
                </div>
                <p className="mt-1 whitespace-pre-line text-ink-soft">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 rounded-lg border border-marigold/30 bg-marigold-100 p-3 text-xs text-marigold-dark">
          Messages show as <strong>simulated</strong> until WhatsApp Business API credentials
          (WHATSAPP_TOKEN and WHATSAPP_PHONE_ID) are configured. Nothing is sent to real phones
          in this state — the exact text that would go out is recorded here instead.
        </p>
      </Card>
    </div>
  );
}

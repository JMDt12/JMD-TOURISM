import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, Badge, Spinner, ErrorNote, Empty, Stars } from '../components/ui.jsx';
import { StatusBadge } from './Confirmation.jsx';
import { dateLong, time, dayInput } from '../lib/format.js';
import { BRAND, PHONES } from '../lib/brand.js';

export default function MyTrips() {
  const { user, refresh } = useAuth();
  const { data, loading, error, reload } = useApi('/bookings');
  const pending = useApi('/reviews/pending');
  const [tab, setTab] = useState('upcoming');
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);

  const cancel = async (b) => {
    const ok = window.confirm(
      b.confirmed
        ? `Cancel ${b.reference}?\n\nOur office will settle anything outstanding with you directly. Notice periods apply: free more than 24h before departure.`
        : `Withdraw request ${b.reference}?\n\nNothing has been charged, so this simply takes it out of our queue.`
    );
    if (!ok) return;
    setBusy(b.reference);
    try {
      await api.post(`/bookings/${b.reference}/cancel`);
      setNotice(
        b.confirmed
          ? 'Cancelled. Our Mathura office will call you to settle anything outstanding.'
          : 'Request withdrawn. Nothing was charged.'
      );
      reload();
      pending.reload();
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Spinner label="Loading your trips" />;
  if (error) return <div className="mx-auto max-w-2xl p-4"><ErrorNote error={error} onRetry={reload} /></div>;

  const list = tab === 'upcoming' ? data.upcoming : data.past;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">My trips</h1>
          <p className="text-sm text-ink-soft">Signed in as {user?.name} · {user?.phone}</p>
        </div>
        <LoyaltyCard user={user} onRefresh={refresh} />
      </header>

      {notice && (
        <p className="mt-4 rounded-xl border border-peacock/30 bg-peacock-100 p-3 text-sm text-peacock">
          {notice}
        </p>
      )}

      {!!pending.data?.pending?.length && tab === 'upcoming' && (
        <ReviewPrompt items={pending.data.pending} onDone={() => { pending.reload(); reload(); }} />
      )}

      <div className="mt-5 flex gap-2">
        {[['upcoming', `Upcoming (${data.upcoming.length})`], ['past', `Past (${data.past.length})`]].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            aria-pressed={tab === k}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
              tab === k ? 'border-indigo-brand bg-indigo-brand text-white' : 'border-line bg-white hover:bg-paper-2'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {!list.length && (
          <Empty
            title={tab === 'upcoming' ? 'Nothing requested yet' : 'No past trips'}
            hint={tab === 'upcoming' ? 'Find a bus and send us a request — your quote and ticket both land here.' : null}
            action={<Link to="/search" className="btn btn-primary">Find a bus</Link>}
          />
        )}
        {list.map((b) => (
          <BookingCard key={b.reference} b={b} onCancel={cancel} busy={busy === b.reference} />
        ))}
      </div>
    </div>
  );
}

function BookingCard({ b, onCancel, busy }) {
  const cancelled = b.bookingStatus === 'cancelled';
  const live = b.trip?.status === 'ongoing' && b.confirmed;

  return (
    <Card className={`overflow-hidden ${cancelled ? 'opacity-70' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper-2 px-4 py-2.5">
        <span className="font-display">{b.reference}</span>
        <span className="flex flex-wrap items-center gap-1.5">
          {live && <Badge tone="live"><span className="live-dot size-1.5 rounded-full bg-sindoor" /> On the road</Badge>}
          <StatusBadge status={b.bookingStatus} />
          {b.checkedInAt && <Badge tone="ink">Checked in</Badge>}
        </span>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto]">
        <div className="text-sm">
          <p className="font-display text-lg">
            {b.trip
              ? `${b.trip.origin} → ${b.trip.destination}`
              : b.rental?.name ?? b.package?.title}
          </p>
          {b.rental?.subtitle && <p className="text-ink-soft">{b.rental.subtitle}</p>}
          <p className="text-ink-soft">{dateLong(b.departure ?? b.travelDate)}</p>
          {b.trip && <p className="text-ink-soft">Departs {time(b.departure)} · {b.trip.busName} · {b.trip.registrationNo}</p>}
          {b.wholeBus && (
            <p className="mt-1">Whole bus · {b.capacity} seats · {b.partySize} travelling</p>
          )}
          {b.rental && (
            <p className="mt-1">
              {b.units} {b.rental.kind === 'room' ? 'room' : b.rental.kind}{b.units > 1 ? 's' : ''}
              {b.endDate ? ` · until ${dateLong(b.endDate)}` : ''} · {b.rental.city}
            </p>
          )}
          {b.pickup && <p className="text-ink-soft">Boarding: {b.pickup.area_name}, {b.pickup.city}</p>}
          {b.addons.length > 0 && (
            <p className="mt-1 text-ink-soft">{b.addons.map((a) => a.label).join(' · ')}</p>
          )}
        </div>
        <div className="text-right text-sm text-ink-soft">
          {!b.confirmed && !cancelled && (
            <p className="max-w-[12rem]">
              Waiting on our quote — we will WhatsApp you.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
        <Link to={`/confirmation/${b.reference}`} className="btn btn-ghost py-1.5 text-sm">
          {b.confirmed ? 'Ticket & QR' : 'View request'}
        </Link>
        {b.confirmed && b.trip && (
          <Link to={`/track/${b.trip.id}`} className="btn btn-ghost py-1.5 text-sm">Track</Link>
        )}
        <button className="btn btn-ghost py-1.5 text-sm" onClick={() => downloadSummary(b)}>
          Trip summary
        </button>
        {b.trip && (
          <Link
            className="btn btn-ghost py-1.5 text-sm"
            to={`/search${qs({ from: b.trip.origin, to: b.trip.destination, date: dayInput(), passengers: b.partySize || 1 })}`}
          >
            {cancelled ? 'Ask again' : 'Change date'}
          </Link>
        )}
        {!cancelled && (
          <button className="btn btn-ghost ml-auto py-1.5 text-sm text-sindoor"
                  disabled={busy} onClick={() => onCancel(b)}>
            {busy ? 'Cancelling…' : b.confirmed ? 'Cancel' : 'Withdraw'}
          </button>
        )}
      </div>
    </Card>
  );
}

/**
 * A printable summary of the trip. Not an invoice — the office handles money
 * directly, so no figure appears here and none can go stale.
 */
/** Anything from a booking is user-entered, so it is escaped before it
 *  becomes HTML in the downloaded file. */
const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function downloadSummary(b) {
  const rows = [
    ['Reference', b.reference],
    ['Status', b.bookingStatus],
    ['Trip', b.trip
      ? `${b.trip.origin} to ${b.trip.destination}`
      : b.rental?.name ?? b.package?.title ?? ''],
    ['Date', dateLong(b.departure ?? b.travelDate)],
    ['Vehicle', b.wholeBus
      ? `Whole bus, ${b.capacity} seats — ${b.trip?.busName ?? ''} ${b.trip?.registrationNo ?? ''}`
      : b.rental
        ? `${b.units} × ${b.rental.name}, ${b.rental.city}${b.endDate ? ` (until ${b.endDate})` : ''}`
        : '—'],
    ['Travelling', `${b.partySize} people`],
    ['Lead passenger', b.passengers.map((p) => p.name).join(', ')],
    ['Boarding', b.pickup ? `${b.pickup.area_name}, ${b.pickup.city}` : 'To be confirmed'],
    ...(b.addons.length ? [['Included on request', b.addons.map((a) => a.label).join('; ')]] : []),
  ];
  const html = `<!doctype html><meta charset="utf-8"><title>Trip ${b.reference}</title>
<style>body{font:14px system-ui,sans-serif;color:#201436;max-width:640px;margin:32px auto;padding:0 16px}
h1{font-family:Georgia,serif} table{width:100%;border-collapse:collapse;margin-top:16px}
td,th{padding:8px 0;border-bottom:1px solid #e7dcc9;text-align:left;vertical-align:top}
th{width:38%;color:#5a4b6e;font-weight:600} .muted{color:#5a4b6e}</style>
<h1>${BRAND.name}</h1>
<p class="muted">${BRAND.address}<br>${PHONES.map((x) => x.display).join(" &middot; ")}</p>
<h2>Trip summary ${esc(b.reference)}</h2>
<table>${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>
<p class="muted">Costs are agreed and settled directly with our Mathura office.</p>`;

  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `jmd-trip-${b.reference}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

function LoyaltyCard({ user, onRefresh }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked; the code is on screen anyway */ }
    onRefresh?.();
  };
  if (!user) return null;
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3 text-sm">
      <p className="font-semibold">{user.loyaltyPoints} points</p>
      <p className="text-xs text-ink-soft">Earned every trip you take. Refer a friend, you both gain.</p>
      <button onClick={copy} className="mt-1 text-xs font-semibold text-indigo-brand underline">
        {copied ? 'Copied' : `Code ${user.referralCode}`}
      </button>
    </div>
  );
}

function ReviewPrompt({ items, onDone }) {
  const [open, setOpen] = useState(items[0]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [guideId, setGuideId] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    setBusy(true);
    try {
      await api.post('/reviews', {
        reference: open.reference, rating, comment,
        guideId: guideId || null,
      });
      setOpen(null);
      onDone();
    } catch {
      setOpen(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-4 border-marigold/40 bg-marigold-100/60 p-4">
      <p className="font-display text-lg">How was {open.label}?</p>
      <p className="text-xs text-ink-soft">
        Only travellers who actually went can review, which is why our ratings are worth reading.
      </p>
      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  className={`text-2xl ${n <= rating ? 'text-marigold' : 'text-line'}`}>
            ★
          </button>
        ))}
        <Stars value={rating} />
      </div>
      <textarea
        className="field mt-3" rows={2} value={comment}
        placeholder="What should the next traveller know?"
        onChange={(e) => setComment(e.target.value)}
      />
      {open.guides?.length > 0 && (
        <select className="field mt-2" value={guideId} onChange={(e) => setGuideId(e.target.value)}>
          <option value="">Rate the bus only</option>
          {open.guides.map((g) => (
            <option key={g.guideId} value={g.guideId}>Also rate guide {g.guideName}</option>
          ))}
        </select>
      )}
      <div className="mt-3 flex gap-2">
        <button className="btn btn-primary py-1.5 text-sm" disabled={busy} onClick={submit}>
          {busy ? 'Posting…' : 'Post review'}
        </button>
        <button className="btn btn-ghost py-1.5 text-sm" onClick={() => setOpen(null)}>Not now</button>
      </div>
    </Card>
  );
}

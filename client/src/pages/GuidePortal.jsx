import { useState } from 'react';
import { api } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { Card, Badge, Spinner, ErrorNote, Empty, Stars } from '../components/ui.jsx';
import { dateLong } from '../lib/format.js';

export default function GuidePortal() {
  const { data, loading, error, reload } = useApi('/guides/me/dashboard');
  const [busy, setBusy] = useState(null);

  if (loading) return <Spinner label="Loading your portal" />;
  if (error) return <div className="mx-auto max-w-2xl p-4"><ErrorNote error={error} onRetry={reload} /></div>;

  const { profile, bookings, workload } = data;
  const act = async (id, action) => {
    setBusy(id);
    try { await api.post(`/guides/me/bookings/${id}/${action}`); reload(); }
    finally { setBusy(null); }
  };

  const pending = bookings.filter((b) => b.status === 'pending');
  const accepted = bookings.filter((b) => b.status === 'accepted');

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Guide portal</h1>
          <p className="text-sm text-ink-soft">
            {profile.name} · {profile.specialty} · {profile.baseCity}
          </p>
        </div>
        <Badge tone={profile.verified ? 'verified' : 'warn'}>
          {profile.verified ? 'Verified' : 'Verification pending'}
        </Badge>
      </header>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Awaiting your reply" value={workload.pending} tone="marigold" />
        <Stat label="Accepted, upcoming" value={workload.accepted} tone="peacock" />
        <Stat label="Trips completed" value={workload.completedTrips} />
      </div>

      <section className="mt-8">
        <h2 className="font-display text-xl">Requests waiting on you</h2>
        {!pending.length && (
          <div className="mt-3">
            <Empty title="Nothing pending" hint="Requests appear here once the office confirms a trip you were asked for." />
          </div>
        )}
        <div className="mt-3 space-y-3">
          {pending.map((b) => (
            <Card key={b.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg">{dateLong(`${b.date}T00:00`)}</p>
                  <p className="text-sm text-ink-soft">
                    {b.durationHrs} hours · {b.partySize} traveller{b.partySize > 1 ? 's' : ''} · booking {b.reference}
                  </p>
                  <p className="mt-1 text-sm">
                    {b.customerName} · <a className="underline" href={`tel:${b.customerPhone}`}>{b.customerPhone}</a>
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="btn btn-primary py-1.5 text-sm" disabled={busy === b.id}
                        onClick={() => act(b.id, 'accept')}>
                  Accept
                </button>
                <button className="btn btn-ghost py-1.5 text-sm text-sindoor" disabled={busy === b.id}
                        onClick={() => act(b.id, 'reject')}>
                  Cannot make it
                </button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl">Your calendar</h2>
        <p className="text-sm text-ink-soft">Accepted dates. Travellers see these as unavailable.</p>
        {!accepted.length && <p className="mt-3 text-sm text-ink-soft">Nothing accepted yet.</p>}
        <ul className="mt-3 space-y-2">
          {accepted.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white p-3">
              <span>
                <span className="font-medium">{dateLong(`${b.date}T00:00`)}</span>
                <span className="block text-xs text-ink-soft">
                  {b.customerName} · {b.partySize} people · {b.durationHrs}h · {b.reference}
                </span>
              </span>
              <button className="btn btn-ghost py-1 text-xs" disabled={busy === b.id}
                      onClick={() => act(b.id, 'complete')}>
                Mark done
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl">Your profile</h2>
        <Card className="mt-3 p-4">
          <p className="flex items-center gap-2"><Stars value={profile.rating} count={profile.ratingCount} /></p>
          <p className="mt-2 text-sm text-ink-soft">{profile.bio}</p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <Row label="Languages" value={profile.languages.join(', ')} />
            <Row label="Experience" value={`${profile.yearsExperience} years`} />
            <Row label="Itineraries" value={`${profile.itineraries.length} offered`} />
          </dl>
          <p className="mt-4 rounded-lg border border-line bg-paper-2 p-3 text-xs text-ink-soft">
            Your fee is agreed with the office trip by trip. To change your languages or
            itineraries, or to re-upload ID documents, call the
            Mathura office. Document upload needs an S3 bucket, which is not configured in this build.
          </p>
        </Card>
      </section>
    </div>
  );
}

const Stat = ({ label, value, tone }) => (
  <Card className={`p-4 ${tone === 'peacock' ? 'border-peacock/30 bg-peacock-100' : tone === 'marigold' ? 'border-marigold/30 bg-marigold-100' : ''}`}>
    <p className="text-[10px] font-bold tracking-[0.1em] text-ink-soft uppercase">{label}</p>
    <p className="font-display text-2xl">{value}</p>
  </Card>
);

const Row = ({ label, value }) => (
  <div>
    <dt className="text-xs text-ink-soft">{label}</dt>
    <dd className="font-medium">{value}</dd>
  </div>
);

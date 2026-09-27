import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useT } from '../context/LanguageContext.jsx';
import { Card, Badge, ErrorNote, Empty } from '../components/ui.jsx';
import { dateLong, time } from '../lib/format.js';

/**
 * The way in to live tracking without a ticket in hand: type the reference,
 * or, if signed in, pick from whatever of yours is actually moving.
 */
export default function Tracker() {
  const t = useT();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ref, setRef] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const mine = useApi(user ? '/bookings' : null, { skip: !user });
  const live = (mine.data?.upcoming ?? []).filter((b) => b.confirmed && b.trip);

  const go = async (e) => {
    e.preventDefault();
    const code = ref.trim().toUpperCase().replace(/^JMD:/, '');
    if (!code) return;
    setBusy(true);
    setError(null);
    try {
      // A public lookup, because this page promises no account is needed.
      const d = await api.get(`/tracking/reference/${encodeURIComponent(code)}`);
      if (!d.tripId) throw new Error('not-live');
      navigate(`/track/${d.tripId}`);
    } catch {
      setError(t('tracker.notFound'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-3xl">{t('tracker.title')}</h1>
      <p className="mt-2 text-ink-soft">{t('tracker.body')}</p>

      <Card className="mt-6 p-5">
        <form onSubmit={go}>
          <label className="label" htmlFor="tk-ref">{t('tracker.refLabel')}</label>
          <div className="flex gap-2">
            <input
              id="tk-ref"
              className="field font-display tracking-wide"
              placeholder="JMD-AB12C34"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
            />
            <button className="btn btn-primary shrink-0" disabled={busy || !ref.trim()}>
              {t('tracker.track')}
            </button>
          </div>
          <p className="mt-1 text-xs text-ink-soft">{t('tracker.refHint')}</p>
        </form>
        {error && <p className="mt-3 text-sm text-sindoor">{error}</p>}
      </Card>

      {user && (
        <section className="mt-8">
          <h2 className="font-display text-xl">{t('tracker.yourTrips')}</h2>
          {!live.length && (
            <div className="mt-3">
              <Empty
                title={t('tracker.noneLive')}
                action={<Link to="/my-trips" className="btn btn-ghost">{t('nav.myTrips')}</Link>}
              />
            </div>
          )}
          <div className="mt-3 space-y-3">
            {live.map((b) => (
              <Card key={b.reference} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-display text-lg">
                    {b.trip.origin} → {b.trip.destination}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {dateLong(b.departure)} · {time(b.departure)} · {b.trip.registrationNo}
                  </p>
                </div>
                <span className="flex items-center gap-2">
                  {b.trip.status === 'ongoing' && (
                    <Badge tone="live">
                      <span className="live-dot size-1.5 rounded-full bg-sindoor" />
                      {b.trip.status}
                    </Badge>
                  )}
                  <Link to={`/track/${b.trip.id}`} className="btn btn-ink py-1.5 text-sm">
                    {t('tracker.track')}
                  </Link>
                </span>
              </Card>
            ))}
          </div>
        </section>
      )}

      {!user && (
        <p className="mt-6 text-center text-sm text-ink-soft">
          <Link className="underline" to="/login">{t('nav.signIn')}</Link>
        </p>
      )}
    </div>
  );
}

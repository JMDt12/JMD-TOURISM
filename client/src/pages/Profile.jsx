import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang, useT } from '../context/LanguageContext.jsx';
import LanguagePicker from '../components/LanguagePicker.jsx';
import { Card, Empty, Avatar, Field } from '../components/ui.jsx';
import { api } from '../lib/api.js';

export default function Profile() {
  const { user, signOut } = useAuth();
  const { lang, languages } = useLang();
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [picking, setPicking] = useState(false);

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <Empty
          title={t('profile.notSignedIn')}
          hint={t('profile.signInBody')}
          action={<Link to="/login" className="btn btn-primary">{t('nav.signIn')}</Link>}
        />
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked; the code is on screen anyway */ }
  };

  const current = languages.find((l) => l.code === lang);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="flex items-center gap-4">
        <Avatar name={user.name} alt={user.name} className="w-16" />
        <div>
          <p className="text-[11px] font-bold tracking-[0.14em] text-marigold-dark uppercase">
            {t('profile.title')}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl">{user.name}</h1>
          <p className="text-sm text-ink-soft">{t('profile.signedInAs')} {user.phone}</p>
        </div>
      </header>

      <Card className="mt-6 divide-y divide-line">
        <Row label={t('profile.name')} value={user.name} />
        <Row label={t('profile.phone')} value={user.phone} />
        <Row label={t('profile.email')} value={user.email || '—'} />
        <Row label={t('profile.points')} value={user.loyaltyPoints} />
      </Card>

      <Card className="mt-4 p-5">
        <p className="text-[10px] font-bold tracking-[0.1em] text-ink-soft uppercase">
          {t('profile.referral')}
        </p>
        <p className="mt-1 font-display text-2xl text-indigo-brand">{user.referralCode}</p>
        <p className="mt-1 text-sm text-ink-soft">{t('profile.referralBody')}</p>
        <button className="btn btn-ghost mt-3 py-1.5 text-sm" onClick={copy}>
          {copied ? t('profile.copied') : t('profile.referral')}
        </button>
      </Card>

      <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-[10px] font-bold tracking-[0.1em] text-ink-soft uppercase">
            {t('lang.current')}
          </p>
          <p className="mt-1 font-display text-xl">{current?.native}</p>
        </div>
        <button className="btn btn-ghost py-1.5 text-sm" onClick={() => setPicking(true)}>
          {t('menu.language')}
        </button>
      </Card>

      {user.hasPassword && <ChangePassword />}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/my-trips" className="btn btn-ink">{t('nav.myTrips')}</Link>
        <Link to="/tracker" className="btn btn-ghost">{t('menu.tracker')}</Link>
        <button className="btn btn-ghost ml-auto text-sindoor" onClick={signOut}>
          {t('nav.signOut')}
        </button>
      </div>

      {picking && <LanguagePicker force onClose={() => setPicking(false)} />}
    </div>
  );
}

/** Staff sign in with a password; customers use a one-time code and never see this. */
function ChangePassword() {
  const t = useT();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (next !== confirm) { setError(t('profile.pwMismatch')); return; }
    setBusy(true);
    try {
      await api.post('/auth/password', { currentPassword: current, newPassword: next });
      setCurrent(''); setNext(''); setConfirm('');
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-4 p-5">
      <p className="text-[10px] font-bold tracking-[0.1em] text-ink-soft uppercase">
        {t('profile.pwTitle')}
      </p>
      <form className="mt-3 space-y-3" onSubmit={submit}>
        <Field label={t('profile.pwCurrent')} id="pw-current">
          <input id="pw-current" type="password" className="field" value={current}
                 autoComplete="current-password" required
                 onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label={t('profile.pwNew')} id="pw-new" hint={t('profile.pwHint')}>
          <input id="pw-new" type="password" className="field" value={next}
                 autoComplete="new-password" minLength={10} required
                 onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label={t('profile.pwConfirm')} id="pw-confirm">
          <input id="pw-confirm" type="password" className="field" value={confirm}
                 autoComplete="new-password" minLength={10} required
                 onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-sindoor" role="alert">{error}</p>}
        {done && <p className="text-sm text-peacock" role="status">{t('profile.pwDone')}</p>}
        <button className="btn btn-primary py-1.5 text-sm" disabled={busy}>
          {busy ? t('profile.pwSaving') : t('profile.pwSave')}
        </button>
      </form>
    </Card>
  );
}

const Row = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
    <span className="text-ink-soft">{label}</span>
    <span className="text-right font-medium">{value}</span>
  </div>
);

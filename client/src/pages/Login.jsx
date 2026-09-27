import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, Field, SourceBadge } from '../components/ui.jsx';

/**
 * Phone + OTP is the default because that is how this market signs in.
 * Staff (guides, drivers, HQ) use a password instead.
 */
export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  // Return to exactly where sign-in interrupted: the query string, and the
  // route state that says which bus or tour was being requested. Dropping
  // that state sent every new customer from "Request this bus" back to search.
  const from = state?.from;
  const back = from ? `${from.pathname}${from.search ?? ''}` : '/my-trips';
  const backState = from?.state;

  const [mode, setMode] = useState('otp');
  const [stage, setStage] = useState('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [needName, setNeedName] = useState(false);
  const [password, setPassword] = useState('');
  const [devCode, setDevCode] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const requestOtp = () => run(async () => {
    const d = await api.post('/auth/otp/request', { phone });
    setDevCode(d.devCode ?? null);
    setStage('code');
  });

  const verify = () => run(async () => {
    try {
      const d = await api.post('/auth/otp/verify', { phone, code, name: name || undefined });
      signIn(d.token, d.user);
      navigate(back, { replace: true, state: backState });
    } catch (e) {
      if (e.body?.error === 'name_required') {
        setNeedName(true);
        setError('Almost there — tell us your name.');
        return;
      }
      throw e;
    }
  });

  const passwordLogin = () => run(async () => {
    const d = await api.post('/auth/login', { phone, password });
    signIn(d.token, d.user);
    navigate(d.user.role === 'admin' ? '/hq' : d.user.role === 'guide' ? '/guide-portal'
            : d.user.role === 'driver' ? '/driver-portal' : back, { replace: true, state: backState });
  });

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Card className="p-6">
        <h1 className="font-display text-2xl">Sign in</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Booking direct with the operator. No account is needed to browse or to track a bus.
        </p>

        <div className="mt-4 flex gap-2 text-sm">
          {[['otp', 'Traveller'], ['password', 'Staff']].map(([m, label]) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); setStage('phone'); }}
              aria-pressed={mode === m}
              className={`flex-1 rounded-lg border px-3 py-2 font-semibold ${
                mode === m ? 'border-indigo-brand bg-indigo-brand text-white' : 'border-line bg-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-4">
          <Field label="Mobile number" id="phone">
            <input
              id="phone" className="field" inputMode="numeric" autoComplete="tel"
              placeholder="10-digit number" value={phone}
              disabled={mode === 'otp' && stage === 'code'}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
          </Field>

          {mode === 'otp' && stage === 'code' && (
            <>
              <Field label="Verification code" id="code" hint="Sent to your WhatsApp. Valid 10 minutes.">
                <input id="code" className="field tracking-[0.4em]" inputMode="numeric"
                       placeholder="······" value={code}
                       onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
              </Field>
              {needName && (
                <Field label="Your name" id="name">
                  <input id="name" className="field" value={name}
                         onChange={(e) => setName(e.target.value)} autoComplete="name" />
                </Field>
              )}
              {devCode && (
                <p className="rounded-lg border border-marigold/30 bg-marigold-100 p-2.5 text-xs text-marigold-dark">
                  Development mode: no SMS provider is configured, so the code is <strong>{devCode}</strong>.
                  Wire up an SMS or WhatsApp provider and this stops appearing.
                </p>
              )}
            </>
          )}

          {mode === 'password' && (
            <Field label="Password" id="pw">
              <input id="pw" type="password" className="field" value={password}
                     autoComplete="current-password"
                     onChange={(e) => setPassword(e.target.value)} />
            </Field>
          )}

          {error && <p className="text-sm text-sindoor">{error}</p>}

          {mode === 'otp' ? (
            stage === 'phone' ? (
              <button className="btn btn-primary w-full" disabled={busy || phone.length !== 10}
                      onClick={requestOtp}>
                {busy ? 'Sending…' : 'Send code'}
              </button>
            ) : (
              <>
                <button className="btn btn-primary w-full"
                        disabled={busy || code.length !== 6 || (needName && name.trim().length < 2)}
                        onClick={verify}>
                  {busy ? 'Checking…' : 'Verify and continue'}
                </button>
                <button className="w-full text-sm text-ink-soft underline"
                        onClick={() => { setStage('phone'); setCode(''); setDevCode(null); }}>
                  Use a different number
                </button>
              </>
            )
          ) : (
            <button className="btn btn-primary w-full" disabled={busy || !phone || !password}
                    onClick={passwordLogin}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          )}
        </div>

        {/* Local development only: the live site printed HQ's number and a
            password to every visitor. */}
        {import.meta.env.DEV && (
          <div className="mt-6 border-t border-line pt-4 text-xs text-ink-soft">
            <p className="mb-2 font-semibold">Demo accounts (seeded)</p>
            <ul className="space-y-0.5">
              <li>Traveller: 9812345678 (any code shown on screen)</li>
              <li>Guide: 9000000021 · password demo1234</li>
              <li>Driver: 9000000012 · password demo1234</li>
              <li>HQ admin: 9000000001 · password demo1234</li>
            </ul>
          </div>
        )}
      </Card>

      <div className="mt-4 flex justify-center"><SourceBadge /></div>
      <p className="mt-4 text-center text-sm text-ink-soft">
        Just want to follow a bus? <Link className="underline" to="/">Tracking links need no login.</Link>
      </p>
    </div>
  );
}

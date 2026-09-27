import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api, getToken, setToken } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) { setReady(true); return undefined; }
    // Forget the sign-in only when the server rejects it. A sleeping or
    // briefly failing server used to sign staff out at random; now it is
    // retried for about a minute, which covers a free host waking up.
    let cancelled = false;
    let timer;
    const delays = [3000, 6000, 12000, 20000, 25000];
    const attempt = (n) => {
      api.get('/auth/me')
        .then((d) => { if (!cancelled) { setUser(d.user); setReady(true); } })
        .catch((e) => {
          if (cancelled) return;
          if (e.status === 401 || e.status === 403 || e.status === 404) {
            setToken(null);
            setReady(true);
          } else if (n < delays.length) {
            timer = setTimeout(() => attempt(n + 1), delays[n]);
          } else {
            setReady(true);
          }
        });
    };
    attempt(0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const signIn = useCallback((token, u) => {
    setToken(token);
    setUser(u);
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const d = await api.get('/auth/me');
    setUser(d.user);
    return d.user;
  }, []);

  const value = useMemo(
    () => ({ user, ready, signIn, signOut, refresh }),
    [user, ready, signIn, signOut, refresh]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

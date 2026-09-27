import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LANG, LANGUAGES, readStoredLang, storeLang, translate } from '../lib/i18n.js';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  // `chosen` is null until someone has actually picked, which is what tells
  // the app to show the first-run dialog rather than guessing silently.
  const [lang, setLangState] = useState(() => readStoredLang() ?? DEFAULT_LANG);
  const [chosen, setChosen] = useState(() => readStoredLang() != null);

  useEffect(() => {
    document.documentElement.lang = lang;
    const meta = LANGUAGES.find((l) => l.code === lang);
    document.documentElement.dir = meta?.dir ?? 'ltr';
  }, [lang]);

  const setLang = useCallback((code) => {
    setLangState(code);
    storeLang(code);
    setChosen(true);
  }, []);

  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);

  const value = useMemo(
    () => ({ lang, setLang, t, chosen, languages: LANGUAGES }),
    [lang, setLang, t, chosen]
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider');
  return ctx;
}

/** Shorthand for the common case of only needing the translate function. */
export const useT = () => useLang().t;

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { dict } from '../lib/i18n.js';
import { setFormatLang } from '../lib/format.js';

const Ctx = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('hf_lang') || 'en');
  setFormatLang(lang);

  const setLang = useCallback((l) => {
    localStorage.setItem('hf_lang', l);
    setFormatLang(l);
    document.documentElement.lang = l;
    setLangState(l);
  }, []);

  const value = useMemo(() => ({ lang, setLang, t: (k) => dict[lang]?.[k] ?? dict.en[k] ?? k }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

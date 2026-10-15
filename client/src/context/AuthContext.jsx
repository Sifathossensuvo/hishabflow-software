import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../lib/api.js';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, business: null, plan: null, loading: !!getToken() });

  const apply = useCallback((data) => setState({ user: data.user, business: data.business, plan: data.plan, loading: false }), []);

  const refresh = useCallback(async () => {
    try { apply(await api.get('/auth/me')); }
    catch { setToken(null); setState({ user: null, business: null, plan: null, loading: false }); }
  }, [apply]);

  useEffect(() => { if (getToken()) refresh(); }, [refresh]);

  useEffect(() => {
    const onUnauthorized = () => { setToken(null); setState({ user: null, business: null, plan: null, loading: false }); };
    window.addEventListener('hf:unauthorized', onUnauthorized);
    return () => window.removeEventListener('hf:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    setToken(data.token);
    apply(data);
  }, [apply]);

  const register = useCallback(async (payload) => {
    const data = await api.post('/auth/register', payload);
    setToken(data.token);
    apply(data);
  }, [apply]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* token is dropped either way */ }
    setToken(null);
    setState({ user: null, business: null, plan: null, loading: false });
  }, []);

  const value = useMemo(() => ({
    ...state, login, register, logout, refresh,
    can: (feature) => !!state.plan?.features?.includes(feature),
    isOwner: state.user?.role === 'owner',
    canManage: state.user?.role === 'owner' || state.user?.role === 'manager',
  }), [state, login, register, logout, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

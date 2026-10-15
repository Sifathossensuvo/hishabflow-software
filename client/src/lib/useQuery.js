import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

// Loads data from the API. Keeps showing the previous data while a new filter loads.
export function useQuery(path, params, { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, loading: enabled, error: null });
  const [tick, setTick] = useState(0);
  const key = path + JSON.stringify(params || {});

  useEffect(() => {
    if (!enabled) return undefined;
    const ac = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    api.get(path, params, { signal: ac.signal })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => { if (error.name !== 'AbortError') setState({ data: null, loading: false, error }); });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick, enabled]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

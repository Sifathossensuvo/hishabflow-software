const BASE = import.meta.env.VITE_API_URL || '/api';
const KEY = 'hf_token';

let token = localStorage.getItem(KEY);
export const getToken = () => token;
export function setToken(t) {
  token = t;
  if (t) localStorage.setItem(KEY, t);
  else localStorage.removeItem(KEY);
}

export class ApiError extends Error {
  constructor(message, { status, code, field, extra } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
    this.extra = extra;
  }
}

function buildUrl(path, params) {
  const url = new URL(BASE + path, window.location.origin);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  return url;
}

async function send(method, path, { params, body, signal } = {}) {
  let res;
  try {
    res = await fetch(buildUrl(path, params), {
      method,
      signal,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError('Cannot reach the server. Check your internet and try again.', { code: 'NETWORK' });
  }
  return res;
}

async function parse(res) {
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const e = data?.error || {};
    if (res.status === 401 && token && e.code !== 'BAD_CREDENTIALS') window.dispatchEvent(new Event('hf:unauthorized'));
    throw new ApiError(e.message || 'Something went wrong. Please try again.', { status: res.status, code: e.code, field: e.field, extra: e });
  }
  return data;
}

const call = async (method, path, opts) => parse(await send(method, path, opts));

export const api = {
  get: (path, params, opts) => call('GET', path, { params, ...opts }),
  post: (path, body) => call('POST', path, { body: body ?? {} }),
  put: (path, body) => call('PUT', path, { body: body ?? {} }),
  patch: (path, body) => call('PATCH', path, { body: body ?? {} }),
  del: (path) => call('DELETE', path),
  // Downloads a file (CSV/JSON) while sending the login token.
  async download(path, params, fallbackName = 'download') {
    const res = await send('GET', path, { params });
    if (!res.ok) await parse(res);
    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition') || '';
    const name = /filename="([^"]+)"/.exec(cd)?.[1] || fallbackName;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
};

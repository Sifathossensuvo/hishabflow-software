import { AppError } from './errors.js';

const bad = (field, msg) => new AppError(400, msg, 'VALIDATION', field);
const lab = (key, o) => o.label || key;
const empty = (x) => x === undefined || x === null || (typeof x === 'string' && x.trim() === '');
const OID = /^[a-f\d]{24}$/i;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export const isId = (x) => typeof x === 'string' && OID.test(x);

// Every validator rejects non-primitive input, which also blocks NoSQL operator injection ({ "$gt": "" }).
export const v = {
  str(obj, key, o = {}) {
    const { min = 1, max = 200, optional = false } = o;
    const x = obj?.[key];
    if (empty(x)) {
      if (optional) return '';
      throw bad(key, `${lab(key, o)} is required`);
    }
    if (typeof x !== 'string') throw bad(key, `${lab(key, o)} is invalid`);
    const s = x.trim();
    if (s.length < min) throw bad(key, `${lab(key, o)} must be at least ${min} characters`);
    if (s.length > max) throw bad(key, `${lab(key, o)} must be at most ${max} characters`);
    return s;
  },

  num(obj, key, o = {}) {
    const { min = 0, max = 1e9, optional = false, decimals = 2 } = o;
    let x = obj?.[key];
    if (empty(x)) {
      if ('def' in o) return o.def;
      if (optional) return undefined;
      throw bad(key, `${lab(key, o)} is required`);
    }
    if (typeof x === 'string') x = Number(x);
    if (typeof x !== 'number' || !Number.isFinite(x)) throw bad(key, `${lab(key, o)} must be a number`);
    if (x < min) throw bad(key, `${lab(key, o)} must be at least ${min}`);
    if (x > max) throw bad(key, `${lab(key, o)} is too large`);
    const f = 10 ** decimals;
    return Math.round((x + Number.EPSILON) * f) / f;
  },

  oneOf(obj, key, list, o = {}) {
    const x = obj?.[key];
    if (empty(x)) {
      if ('def' in o) return o.def;
      if (o.optional) return undefined;
      throw bad(key, `${lab(key, o)} is required`);
    }
    if (typeof x !== 'string' || !list.includes(x)) throw bad(key, `${lab(key, o)} is invalid`);
    return x;
  },

  id(obj, key, o = {}) {
    const x = obj?.[key];
    if (empty(x)) {
      if (o.optional) return undefined;
      throw bad(key, `${lab(key, o)} is required`);
    }
    if (!isId(x)) throw bad(key, `${lab(key, o)} is invalid`);
    return x;
  },

  date(obj, key, o = {}) {
    const x = obj?.[key];
    if (empty(x)) return o.optional ? undefined : new Date();
    if (typeof x !== 'string') throw bad(key, `${lab(key, o)} is not a valid date`);
    const d = new Date(YMD.test(x) ? `${x}T12:00:00+06:00` : x);
    if (Number.isNaN(d.getTime())) throw bad(key, `${lab(key, o)} is not a valid date`);
    if (d.getTime() > Date.now() + 36 * 3600 * 1000) throw bad(key, `${lab(key, o)} cannot be in the future`);
    if (d.getFullYear() < 2000) throw bad(key, `${lab(key, o)} is not a valid date`);
    return d;
  },

  phone(obj, key, o = {}) {
    const x = obj?.[key];
    if (empty(x)) {
      if (o.required) throw bad(key, `${lab(key, o)} is required`);
      return '';
    }
    if (typeof x !== 'string') throw bad(key, `${lab(key, o)} is invalid`);
    const m = x.replace(/[\s-]/g, '').match(/^(?:\+?88)?(01[3-9]\d{8})$/);
    if (!m) throw bad(key, 'Enter a valid mobile number, like 017XXXXXXXX');
    return m[1];
  },

  email(obj, key, o = {}) {
    const s = v.str(obj, key, { max: 160, ...o }).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw bad(key, 'Enter a valid email address');
    return s;
  },

  bool(obj, key, def = false) {
    const x = obj?.[key];
    return typeof x === 'boolean' ? x : def;
  },
};

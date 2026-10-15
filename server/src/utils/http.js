export const qs = (val, max = 80) => (typeof val === 'string' ? val.trim().slice(0, max) : '');
export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function paginate(query, { defLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export const pageMeta = (total, page, limit) => ({ total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });

export function sortBy(query, allowed, def) {
  const key = typeof query.sort === 'string' && allowed[query.sort] ? query.sort : def;
  const dir = query.dir === 'asc' ? 1 : -1;
  return { [allowed[key]]: dir, _id: -1 };
}

export const boolQ = (x) => x === '1' || x === 'true';

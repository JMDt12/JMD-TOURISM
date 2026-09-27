const TOKEN_KEY = 'braj.token';

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ }
};

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  const token = auth ? getToken() : null;
  if (token) headers.authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // Offline, or the connection dropped: fetch rejects with "Failed to fetch".
    throw new ApiError('No connection. Check your internet and try again.', 0, null);
  }

  // A proxy or a sleeping host answers with an HTML page, not JSON; parsing it
  // used to surface "Unexpected token '<'" to travellers.
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) {
    const fallback = res.status >= 502 && res.status <= 504
      ? 'Our server is waking up. Please try again in a few seconds.'
      : `Something went wrong (${res.status}). Please try again.`;
    throw new ApiError(data?.error || fallback, res.status, data);
  }
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  put: (p, body) => request(p, { method: 'PUT', body }),
};

/** Query-string helper that drops empty values. */
export const qs = (params) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length)) {
      sp.set(k, Array.isArray(v) ? v.join(',') : String(v));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
};

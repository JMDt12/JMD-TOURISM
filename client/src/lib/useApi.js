import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

/** Fetch a GET endpoint, with loading/error state and a refetch handle. */
export function useApi(path, { skip = false } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!skip);

  const load = useCallback(() => {
    if (skip || !path) return;
    setLoading(true);
    setError(null);
    let stale = false;
    api.get(path)
      .then((d) => { if (!stale) setData(d); })
      .catch((e) => { if (!stale) setError(e); })
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, [path, skip]);

  useEffect(() => load(), [load]);

  return { data, error, loading, reload: load, setData };
}

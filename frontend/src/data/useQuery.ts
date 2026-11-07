import { useEffect, useState, useSyncExternalStore } from 'react';
import { getVersion, subscribe } from './api';

/** Runs an api read and reruns it whenever the data layer reports a change. */
export function useQuery<T>(load: () => Promise<T>, deps: unknown[] = []): { data: T | undefined; loading: boolean } {
  const version = useSyncExternalStore(subscribe, getVersion);
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    load().then((value) => {
      if (!alive) return;
      setData(value);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps]);

  return { data, loading };
}

/** Synchronous read of a store value that updates on change. */
export function useStoreValue<T>(read: () => T): T {
  useSyncExternalStore(subscribe, getVersion);
  return read();
}

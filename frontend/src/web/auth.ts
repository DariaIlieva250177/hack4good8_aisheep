import { useSyncExternalStore } from 'react';

/*
 * Website sign-in (prototype). Remembers in this browser that someone has
 * logged in; there is no real account check yet. Components re-render when
 * it changes, also across tabs.
 */

const KEY = 'acapsWebSignedIn';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return memory;
  }
}
let memory = false; // fallback when storage is blocked

function write(value: boolean) {
  memory = value;
  try {
    if (value) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: the sign-in lasts for this page only */
  }
  listeners.forEach((fn) => fn());
}

export const signIn = () => write(true);
export const signOut = () => write(false);

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => e.key === KEY && fn();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('storage', onStorage);
  };
}

export function useSignedIn(): boolean {
  return useSyncExternalStore(subscribe, read);
}

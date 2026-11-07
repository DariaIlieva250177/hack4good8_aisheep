import { useSyncExternalStore } from 'react';
import { en } from './en';
import type { Translation } from './types';
import type { LanguageCode } from '../data/types';

/*
 * Runtime language switching. Every screen reads its text from the `en`
 * object at render time, so switching swaps the values inside `en` (English
 * first, then the chosen translation on top, so anything missing stays in
 * English) and the app re-renders. The choice is remembered in this browser.
 */

const STORAGE_KEY = 'acapsLanguage';
const CODES: LanguageCode[] = ['en', 'fr', 'es', 'ar', 'pt'];

// Every translations/<code>.ts file exports `<code>`
const modules = import.meta.glob<Record<string, Translation>>('./translations/*.ts', { eager: true });
const DICTS: Partial<Record<LanguageCode, Translation>> = {};
for (const [path, mod] of Object.entries(modules)) {
  const code = path.match(/\/(\w+)\.ts$/)?.[1] as LanguageCode | undefined;
  if (code && mod[code]) DICTS[code] = mod[code];
}

type Plain = Record<string, unknown>;
const isPlain = (v: unknown): v is Plain => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Copy objects and arrays; functions and strings are shared. */
function copy<T>(v: T): T {
  if (Array.isArray(v)) return v.map(copy) as T;
  if (isPlain(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copy(x)])) as T;
  return v;
}

/** Write `src` into `target`, recursing into nested objects. */
function assign(target: Plain, src: Plain) {
  for (const [k, v] of Object.entries(src)) {
    if (v === undefined) continue;
    if (isPlain(v) && isPlain(target[k])) assign(target[k] as Plain, v);
    else target[k] = copy(v);
  }
}

const ENGLISH = copy(en) as unknown as Plain;
let current: LanguageCode = 'en';
const listeners = new Set<() => void>();

export function storedLanguage(): LanguageCode {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
    return v && CODES.includes(v) ? v : 'en';
  } catch {
    return 'en';
  }
}

export function currentLanguage(): LanguageCode {
  return current;
}

/** Switch the whole interface to `code`. Arabic also turns the page right-to-left. */
export function applyLanguage(code: LanguageCode) {
  assign(en as unknown as Plain, copy(ENGLISH));
  if (code !== 'en' && DICTS[code]) assign(en as unknown as Plain, DICTS[code] as Plain);
  current = code;
  document.documentElement.lang = code;
  document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* storage blocked: this session only */
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The current language; components using it re-render when it changes. */
export function useLanguage(): LanguageCode {
  return useSyncExternalStore(subscribe, currentLanguage);
}

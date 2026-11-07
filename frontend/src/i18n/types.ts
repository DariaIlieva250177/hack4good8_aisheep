import type { Strings } from './en';

/**
 * A translation mirrors the English strings object (i18n/en.ts): same keys,
 * same function signatures. Missing keys fall back to English.
 * Arrays (lists of steps, scales) are replaced as a whole.
 */
type Deep<T> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof T]?: T[K] extends (...args: infer A) => any
    ? (...args: A) => string // same parameters; any text (English literal return types are too narrow)
    : T[K] extends readonly unknown[]
      ? T[K]
      : T[K] extends object
        ? Deep<T[K]>
        : T[K];
};

export type Translation = Deep<Omit<Strings, 'numbers'>>;

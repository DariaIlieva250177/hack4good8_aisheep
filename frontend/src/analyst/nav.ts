/*
 * Navigation for code outside components (actions, popovers). Paths are
 * relative to /analyst, e.g. go('/risk/R1043/experts').
 */
export const nav: { go: (to: string, opts?: { replace?: boolean }) => void } = {
  go: () => {},
};
export const go = (to: string, opts?: { replace?: boolean }) => nav.go(to, opts);
export const countryHref = (c: string) => `/country/${encodeURIComponent(c)}`;
export const riskHref = (id: string, tab?: string) => `/risk/${id}${tab ? `/${tab}` : ''}`;

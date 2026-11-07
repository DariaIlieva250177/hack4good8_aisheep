import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeSetting = 'light' | 'dark' | 'system';
type Theme = 'light' | 'dark';

interface ThemeValue {
  setting: ThemeSetting;
  theme: Theme;
  setSetting: (s: ThemeSetting) => void;
}

/* Same key as the pre-paint script in index.html. */
const STORAGE_KEY = 'appTheme';
const QUERY = '(prefers-color-scheme: dark)';
const ThemeContext = createContext<ThemeValue | null>(null);

function readSetting(key: string, fallback: ThemeSetting): ThemeSetting {
  // ?appearance=light|dark: show the app in that theme without saving it (home page preview)
  const forced = new URLSearchParams(window.location.search).get('appearance');
  if (forced === 'light' || forced === 'dark') return forced;
  try {
    const v = localStorage.getItem(key);
    return v === 'light' || v === 'dark' || v === 'system' ? v : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Theme setting, saved per site: the phone app ('appTheme', dark by default)
 * and the website ('webTheme', light by default) keep separate choices.
 */
export function ThemeProvider({
  children,
  storageKey = STORAGE_KEY,
  defaultSetting = 'dark',
}: {
  children: ReactNode;
  storageKey?: string;
  defaultSetting?: ThemeSetting;
}) {
  const [setting, setSettingState] = useState<ThemeSetting>(() => readSetting(storageKey, defaultSetting));
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.(QUERY).matches ?? false);

  useEffect(() => {
    const mql = window.matchMedia?.(QUERY);
    if (!mql) return;
    const onChange = () => setSystemDark(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const theme: Theme = setting === 'system' ? (systemDark ? 'dark' : 'light') : setting;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#03161d' : '#e6f0f8');
  }, [theme]);

  const setSetting = useCallback((s: ThemeSetting) => {
    try {
      localStorage.setItem(storageKey, s);
    } catch {
      /* storage blocked: the choice lasts for this session only */
    }
    setSettingState(s);
  }, [storageKey]);

  const value = useMemo(() => ({ setting, theme, setSetting }), [setting, theme, setSetting]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}

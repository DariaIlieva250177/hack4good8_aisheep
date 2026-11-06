import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeSetting = 'light' | 'dark' | 'system';
type Theme = 'light' | 'dark';

interface ThemeValue {
  setting: ThemeSetting;
  theme: Theme;
  setSetting: (s: ThemeSetting) => void;
}

/* Same key as the pre-paint script in index.html. */
const STORAGE_KEY = 'theme';
const QUERY = '(prefers-color-scheme: dark)';
const ThemeContext = createContext<ThemeValue | null>(null);

function readSetting(): ThemeSetting {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [setting, setSettingState] = useState<ThemeSetting>(readSetting);
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
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#1c262e' : '#e4e8eb');
  }, [theme]);

  const setSetting = useCallback((s: ThemeSetting) => {
    try {
      localStorage.setItem(STORAGE_KEY, s);
    } catch {
      /* storage blocked: the choice lasts for this session only */
    }
    setSettingState(s);
  }, []);

  const value = useMemo(() => ({ setting, theme, setSetting }), [setting, theme, setSetting]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}

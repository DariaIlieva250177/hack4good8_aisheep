import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { loadRichAssets } from './richAssets';

export type Mode = 'lite' | 'rich';
export type LowDataSetting = 'auto' | 'on' | 'off';

interface ModeValue {
  mode: Mode;
  setting: LowDataSetting;
  setSetting: (s: LowDataSetting) => void;
  reducedMotion: boolean;
}

const STORAGE_KEY = 'lowData';
const ModeContext = createContext<ModeValue | null>(null);

function readSetting(): LowDataSetting {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'on' || v === 'off' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

function writeSetting(s: LowDataSetting) {
  try {
    localStorage.setItem(STORAGE_KEY, s);
  } catch {
    /* storage blocked: the setting lasts for this session only */
  }
}

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

/** Decide whether this connection can take the rich assets. */
async function connectionAllowsRich(): Promise<boolean> {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (connection) {
    if (connection.saveData) return false;
    return !['slow-2g', '2g', '3g'].includes(connection.effectiveType ?? '');
  }
  // Safari and Firefox: time a small request instead.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1000);
  const started = performance.now();
  try {
    await fetch(`${import.meta.env.BASE_URL}probe.txt?t=${Date.now()}`, { cache: 'no-store', signal: controller.signal });
    return performance.now() - started < 1000;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function isTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
}

/** Resolves once nobody is typing, so the switch never happens mid-sentence. */
function whenNotTyping(): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (!isTyping()) {
        document.removeEventListener('focusout', onFocusOut);
        resolve();
      }
    };
    const onFocusOut = () => setTimeout(check, 0);
    document.addEventListener('focusout', onFocusOut);
    check();
  });
}

function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const mql = window.matchMedia?.(query);
    if (!mql) return;
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export function ModeProvider({ children }: { children: ReactNode }) {
  // Always start lite so the first screen renders fast.
  const [mode, setMode] = useState<Mode>('lite');
  const [setting, setSettingState] = useState<LowDataSetting>(readSetting);
  const reducedMotion = usePrefersReducedMotion();
  const attempt = useRef(0);

  useEffect(() => {
    document.documentElement.dataset.mode = mode;
  }, [mode]);

  useEffect(() => {
    const id = ++attempt.current;
    const current = () => id === attempt.current;

    if (setting === 'on') {
      setMode('lite');
      return;
    }

    (async () => {
      if (setting === 'auto' && !(await connectionAllowsRich())) {
        if (current()) setMode('lite');
        return;
      }
      await loadRichAssets();
      await whenNotTyping();
      if (current()) setMode('rich');
    })();
  }, [setting]);

  const setSetting = useCallback((s: LowDataSetting) => {
    writeSetting(s);
    setSettingState(s);
  }, []);

  const value = useMemo(() => ({ mode, setting, setSetting, reducedMotion }), [mode, setting, setSetting, reducedMotion]);
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode(): ModeValue {
  const value = useContext(ModeContext);
  if (!value) throw new Error('useMode must be used inside ModeProvider');
  return value;
}

import { useMode } from './ModeContext';
import { useTheme } from './ThemeContext';

/**
 * Settings every log-in starts from: light theme, low-data mode off.
 * (Users can change them again in Profile.)
 */
export function useLoginDefaults() {
  const theme = useTheme();
  const mode = useMode();
  return () => {
    theme.setSetting('light');
    mode.setSetting('off');
  };
}

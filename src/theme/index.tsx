import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { getThemePref, setThemePref, type ThemePref } from '../services/settingsService';
import {
  darkColors,
  fontFamily,
  lightColors,
  motion,
  radius,
  shadow,
  spacing,
  type,
  type ThemeColors,
} from './tokens';

export type { ThemeColors };
export type { ThemePref };

export interface Theme {
  colors: ThemeColors;
  type: typeof type;
  fontFamily: typeof fontFamily;
  spacing: typeof spacing;
  radius: typeof radius;
  shadow: typeof shadow;
  motion: typeof motion;
  isDark: boolean;
}

interface ThemePrefContextValue {
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
}

const ThemePrefContext = createContext<ThemePrefContextValue | null>(null);

/**
 * 主题偏好 Provider：'system' 跟随系统外观，'dark'/'light' 手动覆盖。
 * 偏好通过 settingsService 持久化（getThemePref/setThemePref）。
 */
export function ThemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>('system');

  useEffect(() => {
    getThemePref().then(setPrefState).catch(() => {});
  }, []);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    setThemePref(p).catch(() => {});
  }, []);

  const value = useMemo(() => ({ pref, setPref }), [pref, setPref]);
  return <ThemePrefContext.Provider value={value}>{children}</ThemePrefContext.Provider>;
}

/** 读写主题偏好（供「我的」页深色模式开关使用）。Provider 外回退为非持久的本地状态。 */
export function useThemePref(): ThemePrefContextValue {
  const ctx = useContext(ThemePrefContext);
  const [fallbackPref, setFallbackPref] = useState<ThemePref>('system');
  const fallback = useMemo(
    () => ({ pref: fallbackPref, setPref: setFallbackPref }),
    [fallbackPref]
  );
  return ctx ?? fallback;
}

/**
 * Returns the current theme. Honors the manual preference from
 * ThemePreferenceProvider; 'system' (or no provider) follows the OS scheme.
 */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  const ctx = useContext(ThemePrefContext);
  const pref = ctx?.pref ?? 'system';
  const isDark = pref === 'system' ? scheme === 'dark' : pref === 'dark';
  return {
    colors: isDark ? darkColors : lightColors,
    type,
    fontFamily,
    spacing,
    radius,
    shadow,
    motion,
    isDark,
  };
}

export { lightColors, darkColors, type, fontFamily, spacing, radius, shadow, motion } from './tokens';

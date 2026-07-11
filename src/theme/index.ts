import { useColorScheme } from 'react-native';
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

/**
 * Returns the current theme (light by default, dark when the system
 * color scheme is dark).
 */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
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

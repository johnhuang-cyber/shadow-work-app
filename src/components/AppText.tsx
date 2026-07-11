import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useTheme } from '../theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'caption';

export interface AppTextProps extends TextProps {
  variant?: Variant;
  /** Explicit color; defaults to textPrimary. */
  color?: string;
  /** Shortcut for textSecondary. */
  secondary?: boolean;
}

export function AppText({
  variant = 'body',
  color,
  secondary,
  style,
  ...rest
}: AppTextProps) {
  const { colors, type, fontFamily } = useTheme();
  const spec = type[variant];
  const isSerif = spec.font === 'serif';
  const family = isSerif
    ? fontFamily.serif
    : spec.weight === '600'
      ? fontFamily.sansSemiBold
      : fontFamily.sans;

  const base: TextStyle = {
    fontFamily: family,
    fontSize: spec.size,
    lineHeight: spec.lineHeight,
    color: color ?? (secondary ? colors.textSecondary : colors.textPrimary),
  };

  return <Text {...rest} style={[base, style]} />;
}

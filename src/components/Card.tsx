import React from 'react';
import { StyleProp, View, ViewProps, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

export interface CardProps extends ViewProps {
  /** Corner radius token; lg (28) per design, md (20) for denser cards. */
  radius?: 'md' | 'lg';
  padding?: number;
  style?: StyleProp<ViewStyle>;
}

export function Card({ radius: radiusKey = 'lg', padding = 24, style, ...rest }: CardProps) {
  const { colors, radius, shadow } = useTheme();

  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius[radiusKey],
          padding,
        },
        shadow.card,
        style,
      ]}
    />
  );
}

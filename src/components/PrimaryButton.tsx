import React from 'react';
import { Pressable, StyleProp, Text, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

export interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  /** Adds the warm accentGlow shadow from the design. */
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({ label, onPress, disabled, glow, style }: PrimaryButtonProps) {
  const { colors, radius, shadow, fontFamily } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [
        {
          height: 56,
          minWidth: 44,
          borderRadius: radius.pill,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
        glow && !disabled ? shadow.accentGlow : null,
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: fontFamily.sansSemiBold,
          fontSize: 17,
          color: colors.textInverse,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

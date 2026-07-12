import React from 'react';
import { Pressable, StyleProp, Text, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

export interface GhostButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  /** Overrides the label color (defaults to textPrimary). */
  labelColor?: string;
  /** Overrides the border color (defaults to hairline). */
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function GhostButton({ label, onPress, disabled, labelColor, borderColor, style }: GhostButtonProps) {
  const { colors, radius, fontFamily } = useTheme();

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
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: borderColor ?? colors.hairline,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
          opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: fontFamily.sansSemiBold,
          fontSize: 17,
          color: labelColor ?? colors.textPrimary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

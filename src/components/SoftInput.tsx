import React from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { useTheme } from '../theme';

export type SoftInputProps = TextInputProps & {
  /** React 19 把 ref 当普通 prop 透传给内部 TextInput（用于 focus 等）。 */
  ref?: React.Ref<TextInput>;
};

export function SoftInput({ style, ...rest }: SoftInputProps) {
  const { colors, radius, type, fontFamily } = useTheme();

  return (
    <TextInput
      multiline
      placeholderTextColor={colors.textSecondary}
      textAlignVertical="top"
      {...rest}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.hairline,
          padding: 16,
          minHeight: 140,
          fontFamily: fontFamily.sans,
          fontSize: type.body.size,
          lineHeight: type.body.lineHeight,
          color: colors.textPrimary,
        },
        style,
      ]}
    />
  );
}

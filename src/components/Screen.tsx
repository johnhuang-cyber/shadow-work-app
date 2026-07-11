import React, { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

export interface ScreenProps {
  children: ReactNode;
  /** Applies horizontal padding of 28 per design; on by default. */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function Screen({ children, padded = true, style, edges = ['top', 'left', 'right'] }: ScreenProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[{ flex: 1, paddingHorizontal: padded ? 28 : 0 }, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

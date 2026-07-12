import { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme';

type FeatherName = keyof typeof Feather.glyphMap;

function tabIcon(name: FeatherName) {
  return ({ color }: { color: ColorValue }) => <Feather name={name} size={22} color={color} />;
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopWidth: 1,
          borderTopColor: colors.hairline,
          elevation: 0,
          shadowOpacity: 0,
          height: 64 + insets.bottom,
          paddingTop: 14,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '今天', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="meditate" options={{ title: '冥想', tabBarIcon: tabIcon('target') }} />
      <Tabs.Screen name="beliefs" options={{ title: '信念', tabBarIcon: tabIcon('heart') }} />
      <Tabs.Screen name="me" options={{ title: '我的', tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}

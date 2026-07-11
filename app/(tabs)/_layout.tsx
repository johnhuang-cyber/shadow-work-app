import { Tabs } from 'expo-router';
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#7A5Fb0' }}>
      <Tabs.Screen name="index" options={{ title: '今天' }} />
      <Tabs.Screen name="meditate" options={{ title: '冥想' }} />
      <Tabs.Screen name="beliefs" options={{ title: '信念' }} />
      <Tabs.Screen name="me" options={{ title: '我的' }} />
    </Tabs>
  );
}

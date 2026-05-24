// app/_layout.tsx
import { Stack } from 'expo-router';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
    <Tabs initialRouteName="community">
      <Tabs.Screen name="index" />
      <Tabs.Screen name="community" />
      <Tabs.Screen name="ai_scan_index" />  
      <Tabs.Screen name="notifications" />
    </Tabs>
}

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});
// app/_layout.tsx
import { Stack } from 'expo-router';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});
// app/_layout.tsx
import { Stack } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'community',
};

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} initialRouteName="community" />;
}
import { AuthProvider } from '@/context/AuthContext';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        {/* Add other non‑tab screens as needed */}
      </Stack>
    </AuthProvider>
  );
}
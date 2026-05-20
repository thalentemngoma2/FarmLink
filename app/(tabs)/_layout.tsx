// app/_layout.tsx
import { Stack } from 'expo-router';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
<<<<<<< HEAD
  return <Stack screenOptions={{ headerShown: false }} initialRouteName="index" />;
}
=======
  return <Stack screenOptions={{ headerShown: false }} />;
}

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});
>>>>>>> remotes/gozilethu/farmlink-Mbutho

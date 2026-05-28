// app/_layout.tsx
import { Tabs } from "expo-router";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, tabBarStyle: { display: "none" } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="tenders" />
      <Tabs.Screen name="suppliers" />
      <Tabs.Screen name="support" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="learn" />
      <Tabs.Screen name="ask" />
      <Tabs.Screen name="ai_scan_index" />
      <Tabs.Screen name="ai" />
    </Tabs>
  );
}

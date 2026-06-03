import { Tabs } from "expo-router";
import { colors } from "../../lib/theme";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.brown50 },
        tabBarActiveTintColor: colors.brown500,
        tabBarInactiveTintColor: colors.brown300,
      }}
    >
      <Tabs.Screen name="feed" options={{ title: "Home" }} />
      <Tabs.Screen name="create-post" options={{ title: "Post" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="profile/edit" options={{ href: null }} />
    </Tabs>
  );
}

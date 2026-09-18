import { Stack } from "expo-router";

// Everything under (app) now lives in one real Stack, so any screen —
// reached from any tab — pushes/pops with genuine, linear history.
// The (tabs) group is itself just one Stack screen; the actual bottom
// tab bar lives in (tabs)/_layout.js.
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

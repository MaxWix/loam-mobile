import { useEffect, useState, useRef } from "react";
import { View, ActivityIndicator } from "react-native";
import { router, Slot } from "expo-router";
import { AuthProvider, useAuth } from "../lib/stores/auth";
import { colors } from "../lib/theme";
import * as Font from "expo-font";

function RootLayoutNav() {
  const { session, loading, supabase } = useAuth();
  const [checking, setChecking] = useState(true);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const hasNavigated = useRef(false);

  useEffect(() => {
    Font.loadAsync({
      BricolageGrotesque: require("../assets/fonts/BricolageGrotesque-Regular.ttf"),
      "BricolageGrotesque-Medium": require("../assets/fonts/BricolageGrotesque-Medium.ttf"),
      "BricolageGrotesque-Bold": require("../assets/fonts/BricolageGrotesque-Bold.ttf"),
      "BricolageGrotesque-ExtraBold": require("../assets/fonts/BricolageGrotesque-ExtraBold.ttf"),
      HostGrotesk: require("../assets/fonts/HostGrotesk-Regular.ttf"),
      "HostGrotesk-Medium": require("../assets/fonts/HostGrotesk-Medium.ttf"),
      "HostGrotesk-Bold": require("../assets/fonts/HostGrotesk-Bold.ttf"),
    }).then(() => setFontsLoaded(true));
  }, []);

  useEffect(() => {
    if (loading || !fontsLoaded || hasNavigated.current) return;

    if (!session) {
      hasNavigated.current = true;
      router.replace("/onboarding/auth");
      setChecking(false);
      return;
    }

    supabase
      .from("profiles")
      .select("username, onboarding_complete")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        hasNavigated.current = true;
        if (!data?.username) {
          router.replace("/onboarding/profile-setup");
        } else if (!data?.onboarding_complete) {
          router.replace("/onboarding/education");
        } else {
          router.replace("/(app)/feed");
        }
        setChecking(false);
      });
  }, [session, loading, fontsLoaded]);

  if (loading || checking || !fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.brown50,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.brown500} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

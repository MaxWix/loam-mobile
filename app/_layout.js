import { useEffect, useState, useRef } from "react";
import { View, ActivityIndicator, ImageBackground } from "react-native";
import { Image } from "expo-image";
import { router, Slot } from "expo-router";
import { AuthProvider, useAuth } from "../lib/stores/auth";
import {
  refreshPushTokenIfGranted,
  getPermissionStatus,
  NOTIF_PROMPT_DISMISSED_KEY,
} from "../lib/utils/pushTokens";
import {
  useNotificationRouting,
  configureForegroundNotifications,
} from "../lib/utils/notificationRouting";
import { colors } from "../lib/theme";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Font from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PHONE_VERIFICATION_ENABLED } from "../lib/config";

// Global handler — set once at module scope, not per render. Without it,
// iOS silently drops notifications that arrive while the app is open.
configureForegroundNotifications();
function RootLayoutNav() {
  const { session, loading, supabase } = useAuth();
  const [checking, setChecking] = useState(true);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  // Tracks *which* session (by user id, or null when signed out) was last
  // routed for — not just "has navigation ever happened." A plain
  // one-shot boolean here would mean this effect only ever runs once for
  // the app's whole lifetime, so signing out later (session -> null)
  // would be silently ignored and never redirect back to onboarding.
  const lastHandledUserId = useRef(undefined);

  // Route notification taps, but only once auth has settled and the
  // initial redirect below has run — pushing before that would get
  // discarded by the router.replace.
  useNotificationRouting(!loading && !checking && fontsLoaded && !!session);

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
    if (loading || !fontsLoaded) return;

    const currentUserId = session?.user?.id ?? null;
    if (lastHandledUserId.current === currentUserId) return;
    lastHandledUserId.current = currentUserId;
    setChecking(true);

    if (!session) {
      router.replace("/onboarding/auth");
      setChecking(false);
      return;
    }

    Promise.all([
      supabase
        .from("profiles")
        .select(
          "username, onboarding_complete, dob_verified, phone_prompt_dismissed_at",
        )
        .eq("id", session.user.id)
        .single(),
      // Own row only — RLS on user_phones allows nothing else.
      supabase
        .from("user_phones")
        .select("verified")
        .eq("user_id", session.user.id)
        .maybeSingle(),
    ]).then(async ([{ data }, { data: phoneRow }]) => {
      const needsPhonePrompt =
        PHONE_VERIFICATION_ENABLED &&
        !phoneRow?.verified &&
        !data?.phone_prompt_dismissed_at;
      if (!data?.username) {
        router.replace("/onboarding/profile-setup");
      } else if (!data?.dob_verified) {
        router.replace("/onboarding/age-verify");
      } else if (!data?.onboarding_complete) {
        router.replace("/onboarding/notifications");
      }
      // else if (needsPhonePrompt) {
      //   // Existing accounts predate phone numbers, so they'd never be
      //   // findable by contact sync. Asked once — dismissing records a
      //   // timestamp so this doesn't reappear at every sign-in.
      //   router.replace("/onboarding/verify-phone");
      // }
      else {
        refreshPushTokenIfGranted(supabase, session.user.id);

        const [permission, dismissed] = await Promise.all([
          getPermissionStatus(),
          AsyncStorage.getItem(NOTIF_PROMPT_DISMISSED_KEY).catch(() => null),
        ]);
        const neverAsked = permission?.status === "undetermined";

        if (neverAsked && !dismissed) {
          router.replace("/onboarding/notifications?next=feed");
        } else {
          router.replace("/(app)/feed");
        }
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.white200 }}>
      <Slot />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

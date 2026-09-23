import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../lib/stores/auth";
import {
  registerForPushNotifications,
  NOTIF_PROMPT_DISMISSED_KEY,
} from "../../lib/utils/pushTokens";
import { colors, layout, buttons, spacing, typography } from "../../lib/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PHONE_VERIFICATION_ENABLED } from "../../lib/config";

// The only place Loam asks for notification permission. Two reasons it
// looks like this:
//
//   1. iOS allows exactly one system prompt per install. Explaining what
//      we'd send *before* triggering it means the decision is informed, and
//      "Not now" here costs nothing — it never reaches the OS dialog, so
//      the one prompt is still available later from Settings.
//   2. This screen doesn't mark onboarding complete — contact sync, the
//      last step, does. Quitting anywhere before that resumes here rather
//      than silently skipping the remaining steps forever.

export default function NotificationsOnboardingScreen() {
  const { supabase, session } = useAuth();
  const { next } = useLocalSearchParams();
  const [working, setWorking] = useState(false);

  const goNext = async () => {
    // Phone + contact sync are parked for now — this screen is the last
    // onboarding step, so it owns marking onboarding complete.
    await supabase
      .from("profiles")
      .update({ onboarding_complete: true })
      .eq("id", session.user.id);
    router.replace("/(app)/feed");
  };

  const handleSkip = async () => {
    if (working) return;
    await AsyncStorage.setItem(NOTIF_PROMPT_DISMISSED_KEY, "1").catch(() => {});
    goNext();
  };

  const handleEnable = async () => {
    if (working) return;
    setWorking(true);
    try {
      // Not provisional here: this ask is already explained and deliberate,
      // so a real prompt is the honest version. Provisional is the better
      // tool for a cold ask, which this isn't.
      await registerForPushNotifications(supabase, session.user.id);
    } catch (e) {
      console.warn("Push registration failed", e);
    } finally {
      // Either answer continues onboarding — declining isn't a dead end.
      setWorking(false);
      goNext();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.wordmark}>loam</Text>

      <View style={styles.content}>
        <Text style={styles.title}>Stay in touch, on your terms</Text>
        <Text style={styles.body}>
          Loam can let you know when a bud comments on your post or wants to
          connect. That's it — no reminders to come back, no nudges about what
          you're missing.
        </Text>
        <Text style={styles.body}>
          You can change exactly what you hear about, or turn it all off, in
          Settings whenever you like.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleEnable}
        disabled={working}
      >
        <Text style={styles.buttonText}>Turn on notifications</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
        disabled={working}
      >
        <Text style={styles.skipText}>Not now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...layout.screen,
    ...layout.screenContent,
  },
  wordmark: layout.wordmark,
  content: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.brown900,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.hg16,
    color: colors.brown500,
    lineHeight: 26,
  },
  button: buttons.primary,
  buttonText: buttons.primaryText,
  skipButton: {
    alignItems: "center",
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  skipText: {
    ...typography.hg16,
    color: colors.brown300,
  },
});

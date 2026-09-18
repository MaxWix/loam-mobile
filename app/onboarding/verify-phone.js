import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../lib/stores/auth";
import {
  startPhoneLink,
  confirmPhoneLink,
  dismissPhonePrompt,
} from "../../lib/utils/phoneAuth";
import {
  colors,
  layout,
  buttons,
  inputs,
  spacing,
  typography,
} from "../../lib/theme";

// Links a verified phone number to the signed-in account. Two entry points
// use this same screen:
//
//   onboarding (?next=contacts)  — new accounts, continues the flow
//   backfill   (no next param)   — existing accounts, returns to the feed
//
// Skipping is always allowed. A number is for being findable by friends who
// already have it, not a requirement to use Loam, so making it mandatory
// would be a shove rather than a nudge.
//
// Layout note: the button lives inside the KeyboardAvoidingView, directly
// under the input, rather than pinned to the bottom of the screen the way
// the resting (no-keyboard) layout might suggest. With the button pinned
// outside the KAV, opening the keyboard would either cover it or leave it
// stranded above the keyboard with a large empty gap where the centered
// content used to be. Keeping button and input together means they move
// as one unit and stay adjacent regardless of keyboard state.

const RESEND_COOLDOWN_S = 30;

export default function VerifyPhoneScreen() {
  const { next } = useLocalSearchParams();
  const { supabase, session } = useAuth();

  const [step, setStep] = useState("enter"); // enter | code
  const [phone, setPhone] = useState("");
  const [e164, setE164] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeInputRef = useRef(null);

  // Every resend costs an SMS, so the button is disabled on a timer rather
  // than relying on people not to tap it repeatedly.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Only reached after a number is actually verified. Contact sync is the
  // next onboarding step, since a verified number is what makes matching
  // work in both directions.
  const goNext = () => {
    if (next === "contacts") router.replace("/onboarding/contacts");
    else router.replace("/(app)/feed");
  };

  const handleSkip = async () => {
    if (working) return;

    if (next === "contacts") {
      // Onboarding, declined. Contact sync is skipped entirely rather than
      // shown anyway: without a verified number the user can find friends
      // but can't be found by them, so syncing here would be a one-sided
      // trade — handing over the address book for half the benefit. They
      // can do both later from Settings once a number is added.
      //
      // Contact sync normally marks onboarding complete; since we're
      // bypassing it, that has to happen here instead or the user would
      // resume into onboarding on every launch.
      if (session?.user?.id) {
        await supabase
          .from("profiles")
          .update({ onboarding_complete: true })
          .eq("id", session.user.id);
      }
      router.replace("/(app)/feed");
      return;
    }

    // Backfill prompt for an existing account — record the dismissal so it
    // doesn't reappear at every sign-in.
    if (session?.user?.id) {
      await dismissPhonePrompt(supabase, session.user.id);
    }
    router.replace("/(app)/feed");
  };

  const handleSendCode = async () => {
    if (working) return;
    setWorking(true);
    setError("");
    const result = await startPhoneLink(supabase, phone);
    setWorking(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setE164(result.e164);
    setStep("code");
    setCooldown(RESEND_COOLDOWN_S);
    setTimeout(() => codeInputRef.current?.focus(), 300);
  };

  const handleResend = async () => {
    if (working || cooldown > 0) return;
    setWorking(true);
    setError("");
    const result = await startPhoneLink(supabase, e164);
    setWorking(false);
    if (result.ok) setCooldown(RESEND_COOLDOWN_S);
    else setError(result.error);
  };

  const handleVerify = async () => {
    if (working || !code.trim()) return;
    setWorking(true);
    setError("");
    const result = await confirmPhoneLink(
      supabase,
      e164,
      code.trim(),
      session.user.id,
    );
    setWorking(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    goNext();
  };

  if (step === "code") {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Text style={styles.wordmark}>loam</Text>

        <View style={styles.content}>
          <Text style={styles.title}>Enter your code</Text>
          <Text style={styles.body}>We sent a 6-digit code to {e164}.</Text>

          <TextInput
            ref={codeInputRef}
            style={[styles.input, styles.codeInput]}
            placeholder="123456"
            placeholderTextColor={colors.brown200}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            maxLength={6}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, working && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={working || code.length < 6}
          >
            <Text style={styles.buttonText}>
              {working ? "Verifying..." : "Verify"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleResend}
            disabled={cooldown > 0 || working}
          >
            <Text
              style={[styles.resend, cooldown > 0 && styles.resendDisabled]}
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setStep("enter");
              setCode("");
              setError("");
            }}
          >
            <Text style={styles.changeNumber}>Use a different number</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.wordmark}>loam</Text>

      <View style={styles.content}>
        <Text style={styles.title}>
          {next === "contacts" ? "Add your number" : "Be easier to find"}
        </Text>
        <Text style={styles.body}>
          Friends who already have your number can find you on Loam without
          having to search. We'll text you a code to confirm it's yours.
        </Text>
        <Text style={styles.body}>
          Your number is never shown on your profile, and we don't use it for
          anything else.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Phone number"
          placeholderTextColor={colors.brown200}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, working && styles.buttonDisabled]}
          onPress={handleSendCode}
          disabled={working || !phone.trim()}
        >
          <Text style={styles.buttonText}>
            {working ? "Sending..." : "Send code"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  input: {
    ...inputs.input,
    marginTop: spacing.md,
  },
  codeInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: "center",
  },
  error: {
    ...typography.hg14,
    color: colors.clay500,
    lineHeight: 20,
  },
  button: {
    ...buttons.primary,
    marginTop: spacing.md,
  },
  buttonDisabled: buttons.disabled,
  buttonText: buttons.primaryText,
  resend: {
    ...typography.hg14,
    color: colors.brown500,
    marginTop: spacing.sm,
  },
  resendDisabled: {
    color: colors.brown300,
  },
  changeNumber: {
    ...typography.hg14,
    color: colors.brown300,
    marginTop: spacing.xs,
  },
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

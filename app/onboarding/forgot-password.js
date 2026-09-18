import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import { useAuth } from "../../lib/stores/auth";
import { colors, inputs, spacing, fonts, buttons } from "../../lib/theme";

export default function ForgotPasswordScreen() {
  const { supabase } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const emailValid = /^\S+@\S+\.\S+$/.test(email.trim());

  const handleSend = async () => {
    if (loading || !emailValid) return;
    setError("");
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: Linking.createURL("/onboarding/reset-password") },
      );
      // Rate limits and network errors are worth surfacing. "No such user"
      // isn't something Supabase reports here, and we don't want to reveal
      // which emails have accounts anyway.
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setSent(true);
    } catch (e) {
      setError("Could not connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.outer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Text style={styles.title}>
          {sent ? "Check your email" : "Forgot password?"}
        </Text>

        {sent ? (
          <>
            <Text style={styles.body}>
              If an account exists for {email.trim()}, we've sent a link to
              reset your password. Open it on this device.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.back()}
            >
              <Text style={styles.buttonText}>Back to log in</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.link}
              onPress={() => setSent(false)}
            >
              <Text style={styles.linkText}>Didn't get it? Try again</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.body}>
              Enter the email you signed up with and we'll send you a reset
              link.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.brown200}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoFocus
              onSubmitEditing={handleSend}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity
              style={[
                styles.button,
                (loading || !emailValid) && styles.buttonDisabled,
              ]}
              onPress={handleSend}
              disabled={loading || !emailValid}
            >
              <Text style={styles.buttonText}>
                {loading ? "Sending..." : "Send reset link"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.link} onPress={() => router.back()}>
              <Text style={styles.linkText}>Back to log in</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

export const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.brown50 },
  outer: {
    flexGrow: 1,
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xxl,
    justifyContent: "center",
  },
  card: {
    width: "100%",
    backgroundColor: colors.lime100,
    borderRadius: 24,
    padding: spacing.lg,
    shadowColor: colors.brown900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    gap: spacing.md,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.brown500,
  },
  body: {
    fontFamily: fonts.primary,
    fontSize: 15,
    color: colors.brown300,
    lineHeight: 22,
  },
  input: { ...inputs.input },
  error: {
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.clay500,
    lineHeight: 18,
  },
  button: { ...buttons.primary },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { ...buttons.primaryText },
  link: { alignItems: "center", paddingVertical: spacing.xs },
  linkText: { fontFamily: fonts.primary, fontSize: 14, color: colors.brown300 },
});

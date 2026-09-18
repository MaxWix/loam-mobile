import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../lib/stores/auth";
import {
  colors,
  inputs,
  spacing,
  typography,
  fonts,
  buttons,
} from "../../lib/theme";

// Import your logo SVGs as image assets
import BrownLettermark from "../../assets/BrownLettermark.svg";
import WhiteOnBrownLogo from "../../assets/whiteOnBrownLogo.svg";

// Login and signup are both email + password. Phone number is still
// collected and verified elsewhere (onboarding, Settings) for contact
// matching, but signing in by phone was removed here — one login path is
// simpler to reason about and test than a per-keystroke branch on what
// looks like an email vs. a phone number.
export default function AuthScreen() {
  const { supabase } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toggleWidth, setToggleWidth] = useState(0);
  const sliderWidth = toggleWidth > 0 ? (toggleWidth - 8) / 2 : 0;

  const toggleSlideAnim = useRef(new Animated.Value(0)).current;
  const contentFadeAnim = useRef(new Animated.Value(1)).current;
  const contentSlideAnim = useRef(new Animated.Value(0)).current;

  const switchMode = (newMode) => {
    setMode(newMode);
    setError("");
    Animated.spring(toggleSlideAnim, {
      toValue: newMode === "login" ? 0 : 1,
      useNativeDriver: false,
      tension: 120,
      friction: 10,
    }).start();
  };

  const isLogin = mode === "login";

  useEffect(() => {
    contentFadeAnim.setValue(0);
    contentSlideAnim.setValue(8);
    Animated.parallel([
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(contentSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [mode]);

  const handleLogin = async () => {
    if (loading || !email.trim() || !password) return;
    setError("");
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) return Alert.alert("Login failed", authError.message);
      router.replace("/(app)/feed");
    } catch (e) {
      Alert.alert("Error", "Could not connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!email || !password || !passwordConfirm) {
      return Alert.alert("Missing fields", "Please fill in all fields.");
    }
    if (password !== passwordConfirm) {
      return Alert.alert("Password mismatch", "Passwords do not match.");
    }
    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return Alert.alert(
        "Weak password",
        "Password must be at least 8 characters with a capital letter, number, and special character.",
      );
    }
    setLoading(true);
    try {
      const { error: signupError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signupError) return Alert.alert("Signup failed", signupError.message);
      router.push("/onboarding/profile-setup");
    } catch (e) {
      Alert.alert("Error", "Could not connect. Please try again.");
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
      {/* Logo area */}
      <View style={styles.logoSection}>
        <View style={styles.logoRow}>
          <WhiteOnBrownLogo width={72} height={72} />
          <BrownLettermark width={140} height={56} />
        </View>
        <Text style={styles.slogan}>Where the scroll ends.</Text>
      </View>

      {/* Elevated card */}
      <View style={styles.card}>
        {/* Toggle */}
        <View
          style={styles.toggle}
          onLayout={(e) => setToggleWidth(e.nativeEvent.layout.width)}
        >
          <Animated.View
            style={[
              styles.toggleSlider,
              {
                width: sliderWidth,
                left: toggleSlideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [4, 4 + sliderWidth],
                }),
              },
            ]}
          />
          <TouchableOpacity
            style={styles.toggleOption}
            onPress={() => switchMode("login")}
          >
            <Text
              style={[styles.toggleText, isLogin && styles.toggleTextActive]}
            >
              Log in
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toggleOption}
            onPress={() => switchMode("signup")}
          >
            <Text
              style={[styles.toggleText, !isLogin && styles.toggleTextActive]}
            >
              Sign up
            </Text>
          </TouchableOpacity>
        </View>

        <Animated.View
          style={{
            opacity: contentFadeAnim,
            transform: [{ translateY: contentSlideAnim }],
            gap: spacing.md,
          }}
        >
          {isLogin ? (
            <>
              <View style={styles.form}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={colors.brown200}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={colors.brown200}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading || !email.trim() || !password}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Logging in..." : "Log in"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/onboarding/forgot-password")}
                style={styles.forgotLink}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.form}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={colors.brown200}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={colors.brown200}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm password"
                  placeholderTextColor={colors.brown200}
                  value={passwordConfirm}
                  onChangeText={setPasswordConfirm}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Creating account..." : "Next"}
                </Text>
              </TouchableOpacity>

              <Text style={styles.disclaimer}>
                We'll set up your profile right after.
              </Text>
            </>
          )}
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.brown50,
  },
  outer: {
    flexGrow: 1,
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  slogan: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.brown500,
    fontStyle: "italic",
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
  toggle: {
    flexDirection: "row",
    backgroundColor: colors.lime300,
    borderRadius: 44,
    padding: 4,
    position: "relative",
  },
  toggleSlider: {
    position: "absolute",
    top: 4,
    width: "48%",
    bottom: 4,
    backgroundColor: colors.green500,
    borderRadius: 44,
    zIndex: 0,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 44,
    alignItems: "center",
    zIndex: 1,
  },
  toggleText: {
    fontFamily: fonts.primary,
    fontSize: 14,
    color: colors.lime900,
  },
  toggleTextActive: {
    fontFamily: fonts.primaryBold,
    color: colors.lime100,
  },
  form: {
    gap: spacing.sm,
  },
  input: {
    ...inputs.input,
  },
  error: {
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.clay500,
    lineHeight: 18,
  },
  button: {
    ...buttons.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...buttons.primaryText,
  },
  forgotLink: {
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  forgotText: {
    fontFamily: fonts.primary,
    fontSize: 14,
    color: colors.brown300,
  },
  disclaimer: {
    fontFamily: fonts.primary,
    fontSize: 13,
    color: colors.brown300,
    textAlign: "center",
    fontStyle: "italic",
  },
});

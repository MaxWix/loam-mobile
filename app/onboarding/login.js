import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../lib/stores/auth";
import {
  colors,
  layout,
  buttons,
  inputs,
  spacing,
  typography,
} from "../../lib/theme";

export default function LoginScreen() {
  const { supabase } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      return Alert.alert(
        "Missing fields",
        "Please enter your email and password.",
      );
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return Alert.alert("Login failed", error.message);
      }

      // Auth store will detect the session change and redirect automatically
      router.replace("/(app)/feed");
    } catch (e) {
      Alert.alert("Error", "Could not connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.wordmark}>loam</Text>
      <Text style={styles.title}>Welcome back</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#B6AFA3"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#B6AFA3"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Logging in..." : "Log in"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/onboarding/forgot-password")}
        style={styles.link}
      >
        <Text style={styles.linkText}>Forgot password?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/onboarding/auth")}
        style={styles.link}
      >
        <Text style={styles.linkText}>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: layout.screen,
  container: layout.screenContent,
  wordmark: layout.wordmark,
  title: {
    ...typography.h1,
    color: colors.brown900,
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  input: inputs.input,
  button: buttons.primary,
  buttonDisabled: buttons.disabled,
  buttonText: buttons.primaryText,
  link: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  linkText: {
    ...typography.hg14,
    color: colors.brown300,
  },
});

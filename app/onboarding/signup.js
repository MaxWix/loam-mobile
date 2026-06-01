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

export default function SignupScreen() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    passwordConfirm: "",
    dob: "",
  });
  const [loading, setLoading] = useState(false);
  const { supabase } = useAuth();

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateAge = (dob) => {
    const birth = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    const dayDiff = today.getDate() - birth.getDate();
    return monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
  };

  const handleSignup = async () => {
    const { firstName, lastName, email, password, passwordConfirm, dob } = form;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !passwordConfirm ||
      !dob
    ) {
      return Alert.alert("Missing fields", "Please fill in all fields.");
    }

    if (validateAge(dob) < 16) {
      return Alert.alert(
        "Age requirement",
        "You must be at least 16 years old to use Loam.",
      );
    }

    if (password !== passwordConfirm) {
      return Alert.alert("Password mismatch", "Passwords do not match.");
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return Alert.alert(
        "Weak password",
        "Password must be at least 8 characters and include a capital letter, number, and special character.",
      );
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`,
          },
        },
      });
      console.log("Session after signup:", data.session);

      if (error) {
        return Alert.alert("Signup failed", error.message);
      }

      router.push("/onboarding/profile-setup");
    } catch (e) {
      Alert.alert("Error", "Could not connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.wordmark}>loam</Text>
      <Text style={styles.title}>Create your account</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="First name"
          placeholderTextColor="#B6AFA3"
          value={form.firstName}
          onChangeText={(v) => updateField("firstName", v)}
        />
        <TextInput
          style={styles.input}
          placeholder="Last name"
          placeholderTextColor="#B6AFA3"
          value={form.lastName}
          onChangeText={(v) => updateField("lastName", v)}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#B6AFA3"
          value={form.email}
          onChangeText={(v) => updateField("email", v)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Date of birth (YYYY-MM-DD)"
          placeholderTextColor="#B6AFA3"
          value={form.dob}
          onChangeText={(v) => updateField("dob", v)}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#B6AFA3"
          value={form.password}
          onChangeText={(v) => updateField("password", v)}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          placeholderTextColor="#B6AFA3"
          value={form.passwordConfirm}
          onChangeText={(v) => updateField("passwordConfirm", v)}
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

      <TouchableOpacity
        onPress={() => router.push("/onboarding/login")}
        style={styles.loginLink}
      >
        <Text style={styles.loginText}>Already have an account? Log in</Text>
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
  loginLink: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  loginText: {
    ...typography.hg14,
    color: colors.brown300,
  },
});

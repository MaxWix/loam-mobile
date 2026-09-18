import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../../lib/stores/auth";
import Input from "../../../lib/components/Input";
import Button from "../../../lib/components/Button";
import { colors, fonts, spacing, typography } from "../../../lib/theme";
import { MaterialIcons } from "@expo/vector-icons";

export default function UpdatePasswordScreen() {
  const { supabase } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!password) {
      return Alert.alert("Required", "Please enter a new password.");
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return Alert.alert(
        "Weak password",
        "Password must be at least 8 characters with a capital letter, number, and special character.",
      );
    }

    if (password !== confirmPassword) {
      return Alert.alert("Mismatch", "Passwords do not match.");
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return Alert.alert("Error", error.message);

      Alert.alert("Success", "Password updated. Please log in again.", [
        { text: "OK", onPress: () => supabase.auth.signOut() },
      ]);
    } catch (e) {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
        hitSlop={12}
      >
        <MaterialIcons name="arrow-back" size={24} color={colors.brown500} />
      </TouchableOpacity>

      <Text style={styles.title}>Update Password</Text>
      <Text style={styles.subtitle}>
        Choose a new password for your account.
      </Text>

      <View style={styles.form}>
        <Input
          value={password}
          onChangeText={setPassword}
          placeholder="New password"
          secureTextEntry
          autoCapitalize="none"
        />
        <Input
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm new password"
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      <Button onPress={handleUpdate} disabled={loading}>
        {loading ? "Saving..." : "Save New Password"}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: 60,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 24,
    color: colors.brown900,
  },
  subtitle: {
    fontFamily: fonts.primary,
    fontSize: 16,
    color: colors.brown500,
    lineHeight: 22,
  },
  form: {
    gap: spacing.sm,
  },
});

import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useAuth } from "../../lib/stores/auth";
import {
  colors,
  layout,
  buttons,
  spacing,
  typography,
  fonts,
} from "../../lib/theme";

const MAX_DATE = new Date(); // can't pick future
const DEFAULT_DATE = new Date(2000, 0, 1); // start at year 2000

export default function AgeVerifyScreen() {
  const { supabase, session } = useAuth();
  const [dob, setDob] = useState(DEFAULT_DATE);
  const [loading, setLoading] = useState(false);

  const validateAge = (date) => {
    const today = new Date();
    const age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    const dayDiff = today.getDate() - date.getDate();
    return monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
  };

  const handleNext = async () => {
    const age = validateAge(dob);

    if (age < 16) {
      return Alert.alert(
        "Age requirement",
        "You must be at least 16 years old to use Loam.",
      );
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ dob_verified: true })
        .eq("id", session.user.id);

      if (error) return Alert.alert("Error", error.message);
      router.push("/onboarding/notifications");
    } catch (e) {
      Alert.alert("Error", "Could not continue. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.wordmark}>loam</Text>

      <View style={styles.content}>
        <Text style={styles.title}>How old are you?</Text>
        <Text style={styles.subtitle}>
          You must be at least 16 years old to use Loam. We don't store your
          date of birth.
        </Text>

        <DateTimePicker
          value={dob}
          mode="date"
          display="spinner"
          onChange={(event, selectedDate) => {
            if (selectedDate) setDob(selectedDate);
          }}
          maximumDate={MAX_DATE}
          textColor={colors.brown500}
          style={styles.picker}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleNext}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Verifying..." : "Next"}
        </Text>
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
    gap: spacing.lg,
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
    lineHeight: 24,
  },
  picker: {
    width: "100%",
    height: 200,
  },
  button: buttons.primary,
  buttonDisabled: buttons.disabled,
  buttonText: buttons.primaryText,
});

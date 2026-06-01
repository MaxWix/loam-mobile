import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { colors, layout, buttons, spacing, typography } from "../../lib/theme";

export default function AuthScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.wordmark}>loam</Text>

      <View style={styles.content}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>
          Real sharing with people you actually care about.
        </Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/onboarding/welcome")}
        >
          <Text style={styles.primaryButtonText}>Create account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/onboarding/login")}
        >
          <Text style={styles.secondaryButtonText}>Log in</Text>
        </TouchableOpacity>
      </View>
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
  },
  title: {
    ...typography.h1,
    color: colors.brown900,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.hg18,
    color: colors.brown500,
    lineHeight: 26,
    marginBottom: spacing.xl,
  },
  buttons: {
    gap: spacing.sm,
  },
  primaryButton: buttons.primary,
  primaryButtonText: buttons.primaryText,
  secondaryButton: buttons.ghost,
  secondaryButtonText: buttons.ghostText,
});
